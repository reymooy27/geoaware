import { PrismaClient } from '@prisma/client';
import { getEnv } from '../config/env.js';

const globalForPrisma = globalThis as unknown as {
  __geoawarePrisma?: PrismaClient;
};

function resolveConnectionString(): string {
  const env = getEnv();
  return env.DATABASE_URL;
}

function createClient(): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: resolveConnectionString() } } });
}

function getClient(): PrismaClient {
  return (globalForPrisma.__geoawarePrisma ??= createClient());
}

export async function resetPrismaClient(): Promise<void> {
  const stale = globalForPrisma.__geoawarePrisma;
  globalForPrisma.__geoawarePrisma = undefined;
  try { if (stale) await stale.$disconnect(); } catch { /* ignore */ }
}

export async function query<T = any>(path: string): Promise<T[]> {
  const env = getEnv();
  const url = env.SUPABASE_URL || 'https://yqwcodxrouaahuhgvcdj.supabase.co';
  const key = env.SUPABASE_ANON_KEY || '';
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} ${error}`);
  }
  return response.json();
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client as object, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
