import { sha256 } from "@oslojs/crypto/sha2";
import { Session, sessions, User, users } from "./schema";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { createMiddleware } from 'hono/factory'
import { hash, verify } from "argonia";
import { sha1 } from "@oslojs/crypto/sha1";

async function getUserFromEmail(db: D1Database, email: string): Promise<User | null> {
    const user = await getDb(db).select().from(users).where(eq(users.email, email))
    return user.length === 0 ? null : user[0]
}

export async function login(db: D1Database, email: string, password: string): Promise<{ error: false, data: { user: User, session: Session } } | { error: true, data: string }> {
    const user = await getUserFromEmail(db, email)
    if (user === null) {
        return { error: true, data: "Account does not exist" }
    }
    const passwordHash = await getUserPasswordHash(db, user.id)
    if (passwordHash === null) {
        return { error: true, data: "Invalid user ID" }
    }
    const isValidPassword = verify(passwordHash, password)
    if (!isValidPassword) {
        return { error: true, data: "Invalid password" }
    }
    const sessionToken = generateSessionToken()
    const session = await createSession(db, sessionToken, user.id)
    return { error: false, data: { user, session } }
}

export async function signup(db: D1Database, email: string, name: string, password: string): Promise<{ error: false, data: { user: User, session: Session } } | { error: true, data: string }> {
    if (!verifyEmailInput(email)) {
        return { error: true, data: "Invalid email" }
    }
    const isEmailAvailable = await checkEmailAvailability(db, email)
    if (!isEmailAvailable) {
        return { error: true, data: "Email is already used" }
    }
    const isStrongPassword = await verifyPasswordStrength(password)
    if (!isStrongPassword) {
        return { error: true, data: "Weak password" }
    }
    const user = await createUser(db, email, name, password)
    const sessionToken = generateSessionToken()
    const session = await createSession(db, sessionToken, user.id)
    return { error: false, data: { user, session } }
}

export async function updatePassword(db: D1Database, userId: number, oldPassword: string, newPassword: string): Promise<AuthSessionResult> {
    const isStrongPassword = await verifyPasswordStrength(newPassword)
    if (!isStrongPassword) {
        return { error: true, data: "Weak password" }
    }
    const passwordHash = await getUserPasswordHash(db, userId)
    const isValidPassword = verify(passwordHash!, oldPassword)
    if (!isValidPassword) {
        return { error: true, data: "Incorrect password" }
    }
    await invalidateUserSessions(db, userId)
    await updateUserPassword(db, userId, newPassword)
    const sessionToken = generateSessionToken()
    const session = await createSession(db, sessionToken, userId)
    return { error: false, data: session }
}

export async function updateProfile(db: D1Database, userId: number, name?: string, email?: string) {
    await getDb(db).update(users).set({ name, email }).where(eq(users.id, userId))
}

async function updateUserPassword(db: D1Database, userId: number, password: string) {
    const passwordHash = hash(password)
    await getDb(db).update(users).set({ passwordHash }).where(eq(users.id, userId))
}

async function createUser(db: D1Database, email: string, name: string, password: string): Promise<User> {
    const passwordHash = hash(password)
    const user = await getDb(db).insert(users).values({
        email,
        name,
        passwordHash
    }).returning()
    return user[0]
}

async function verifyPasswordStrength(password: string): Promise<boolean> {
    if (password.length < 8 || password.length > 255) {
        return false;
    }
    const hash = encodeHexLowerCase(sha1(new TextEncoder().encode(password)));
    const hashPrefix = hash.slice(0, 5);
    const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`);
    const data = await response.text();
    const items = data.split("\n");
    for (const item of items) {
        const hashSuffix = item.slice(0, 35).toLowerCase();
        if (hash === hashPrefix + hashSuffix) {
            return false;
        }
    }
    return true;
}

async function checkEmailAvailability(db: D1Database, email: string): Promise<boolean> {
    const row = await getDb(db).select().from(users).where(eq(users.email, email))
    return row.length !== 0
}

function verifyEmailInput(email: string): boolean {
    return /^.+@.+\..+$/.test(email) && email.length < 256;
}

async function getUserPasswordHash(db: D1Database, userId: number): Promise<string | null> {
    const row = await getDb(db).select().from(users).where(eq(users.id, userId))
    if (row.length === 0) {
        return null
    }
    return row[0].passwordHash
}

function generateSessionToken(): string {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes)
    const token = encodeBase32LowerCaseNoPadding(bytes)
    return token
}

async function createSession(db: D1Database, token: string, userId: number): Promise<Session> {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
    const session: Session = {
        id: sessionId,
        userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
    await getDb(db).insert(sessions).values(session)
    return session
}

export async function validateSessionToken(db: D1Database, token: string): Promise<SessionValidationResult> {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
    const result = await getDb(db).select({ user: users, session: sessions }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(eq(sessions.id, sessionId))
    if (result.length < 1) {
        return { session: null, user: null }
    }
    const { user, session } = result[0]
    if (Date.now() >= session.expiresAt.getTime()) {
        await getDb(db).delete(sessions).where(eq(sessions.id, session.id));
        return { session: null, user: null };
    }
    if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
        session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        await getDb(db).update(sessions).set({
            expiresAt: session.expiresAt
        }).where(eq(sessions.id, session.id))
    }
    return { session, user }
}

async function invalidateUserSessions(db: D1Database, userId: number): Promise<void> {
    await getDb(db).delete(sessions).where(eq(sessions.userId, userId))
}

export type SessionValidationResult =
    | { session: Session; user: User }
    | { session: null; user: null };

export type AuthResult = { error: false, data: { user: User, session: Session } } | { error: true, data: string }
export type AuthSessionResult = { error: false, data: Session } | { error: true, data: string }
