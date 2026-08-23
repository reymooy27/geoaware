import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { getEnv, getBindings } from '../config/env.js';
import { SUPABASE_CA_CHAIN } from '../config/supabase-ca.js';

const globalForPrisma = globalThis as unknown as {
  __geoawarePrisma?: PrismaClient;
};

function resolveConnectionString(): string {
  // Hyperdrive terminates TLS at Cloudflare's edge and returns a local
  // connection string — the only reliable Postgres path from Workers, since
  // workerd rejects Supabase's private-root CA chain on direct TCP.
  const hyperdrive = getBindings().HYPERDRIVE;
  if (hyperdrive) return hyperdrive.connectionString;
  return getEnv().DATABASE_URL;
}

function createClient(): PrismaClient {
  const pool = new Pool({
    connectionString: resolveConnectionString(),
    max: 5,
    ssl: { ca: SUPABASE_CA_CHAIN },
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

/**
 * Lazy proxy so every existing `prisma.x` call site keeps working while client
 * creation is deferred until the first access — i.e. after `initEnv()` has run
 * in the Worker entry point.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = (globalForPrisma.__geoawarePrisma ??= createClient());
    const value = Reflect.get(client as object, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
