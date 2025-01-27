import { Context } from 'hono';
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';

let drizzleInstance: (DrizzleD1Database<Record<string, never>> & {
    $client: D1Database;
}) | undefined;

export function getDb(db: D1Database) {
    if (drizzleInstance === undefined) {
        drizzleInstance = drizzle(db)
    }
    return drizzleInstance
}

export type Ctx = Context<{ Bindings: CloudflareBindings }>;
