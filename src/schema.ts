import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel } from "drizzle-orm";

export const users = sqliteTable("users", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").unique().notNull(),
    passwordHash: text("password_hash").notNull(),
});

export const sessions = sqliteTable("sessions", {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    expiresAt: integer("expires_at", {
        mode: "timestamp",
    }).notNull(),
});

export const taskQueue = sqliteTable("task_queue", {
    id: integer("id").primaryKey(),
    timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
    cron: text("cron").notNull(),
    payload: text("payload").notNull(),
    oneTime: integer("one_time", { mode: "boolean" }).notNull(),
}, (t) => [
    index("timestamp_idx").on(t.timestamp),
]);

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
export type TaskQueue = InferSelectModel<typeof taskQueue>;
