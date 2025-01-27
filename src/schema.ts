import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { InferSelectModel } from "drizzle-orm";

export const users = sqliteTable('users', {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').unique().notNull(),
    passwordHash: text("password_hash").notNull()
});

export const sessions = sqliteTable("sessions", {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    expiresAt: integer("expires_at", {
        mode: "timestamp"
    }).notNull()
})

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
