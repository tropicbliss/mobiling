import { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';

export function getDb(ctx: Context<{ Bindings: CloudflareBindings }>) {
    return drizzle(ctx.env.DB)
}