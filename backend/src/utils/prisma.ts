import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { getEnv, getBindings } from '../config/env.js';
import { SUPABASE_CA_CHAIN } from '../config/supabase-ca.js';

const globalForPrisma = globalThis as unknown as {
  __geoawarePrisma?: PrismaClient;
};

function resolveConnectionString(): string {
  const env = getEnv();
  // Prefer Hyperdrive: it terminates TLS at the edge and returns a local
  // connection string — the only reliable Postgres path from Workers, since
  // workerd rejects Supabase's private-root CA chain on direct TCP.
  const hyperdrive = getBindings().HYPERDRIVE;
  if (hyperdrive) return hyperdrive.connectionString;
  return env.DATABASE_URL;
}

function createPool(): Pool {
  const viaHyperdrive = Boolean(getBindings().HYPERDRIVE);
  const pool = new Pool({
    connectionString: resolveConnectionString(),
    max: 5,
    // Hyperdrive terminates TLS before the connection reaches us, so the CA
    // chain only applies to direct Supabase connections. In local dev workerd
    // rejects Supabase's private-root CA, so skip verification.
    ...(viaHyperdrive
      ? {}
      : { ssl: { ca: SUPABASE_CA_CHAIN, rejectUnauthorized: false } }),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 15_000,
    query_timeout: 15_000,
  });
  pool.on('error', (err) => console.error('[prisma] pg pool error:', err));
  return pool;
}

function createClient(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg(createPool()) });
}

function getClient(): PrismaClient {
  return (globalForPrisma.__geoawarePrisma ??= createClient());
}

/**
 * In local workerd, pooled pg sockets do not survive across requests: a
 * reused idle connection hangs until timeout. Call this at the start of each
 * request (dev only) so every request gets a fresh pool.
 */
export function resetPrismaForRequest(): void {
  const stale = globalForPrisma.__geoawarePrisma;
  if (!stale) return;
  globalForPrisma.__geoawarePrisma = undefined;
  void stale.$disconnect().catch(() => {});
}

/**
 * Lazy proxy so every existing `prisma.x` call site keeps working while client
 * creation is deferred until the first access — i.e. after `initEnv()` has run
 * in the Worker entry point.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client as object, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
