import { Context } from 'hono';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';

interface KvTable {
    key: string;
    value: string;
}

interface Database {
    kv: KvTable;
}

export function getDb(ctx: Context<{ Bindings: CloudflareBindings }>) {
    return new Kysely<Database>({ dialect: new D1Dialect({ database: ctx.env.DB }) })
}