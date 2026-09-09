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

export function toWKB(lng: number, lat: number): string {
  const buf = new ArrayBuffer(25);
  const view = new DataView(buf);
  view.setUint8(0, 1);
  view.setUint32(1, 0x20000001, true);
  view.setUint32(5, 4326, true);
  view.setFloat64(9, lng, true);
  view.setFloat64(17, lat, true);
  const bytes = new Uint8Array(buf);
  return '\\x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function wkbToGeoJSON(hex: string): any {
  try {
    const clean = hex.replace(/^\\x/, '').replace(/^0x/, '');
    const bytes = new Uint8Array(Math.ceil(clean.length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const byteOrder = view.getUint8(0);
    const le = byteOrder === 1;
    const type = view.getUint32(1, le);
    const hasSrid = type & 0x20000000;
    const geomType = type & 0xff;
    let offset = hasSrid ? 9 : 5;

    if (geomType === 1) {
      const x = view.getFloat64(offset, le);
      const y = view.getFloat64(offset + 8, le);
      return { type: 'Point', coordinates: [x, y] };
    }

    if (geomType === 2) {
      const n = view.getUint32(offset, le);
      offset += 4;
      const coords: number[][] = [];
      for (let i = 0; i < n; i++) {
        const x = view.getFloat64(offset, le);
        const y = view.getFloat64(offset + 8, le);
        coords.push([x, y]);
        offset += 16;
      }
      return { type: 'LineString', coordinates: coords };
    }

    if (geomType === 3) {
      const numRings = view.getUint32(offset, le);
      offset += 4;
      const rings: number[][][] = [];
      for (let r = 0; r < numRings; r++) {
        const n = view.getUint32(offset, le);
        offset += 4;
        const ring: number[][] = [];
        for (let i = 0; i < n; i++) {
          const x = view.getFloat64(offset, le);
          const y = view.getFloat64(offset + 8, le);
          ring.push([x, y]);
          offset += 16;
        }
        rings.push(ring);
      }
      return { type: 'Polygon', coordinates: rings };
    }

    return null;
  } catch {
    return null;
  }
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

export async function supabaseInsert<T = any>(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[],
  opts?: { deduplicateBy?: string }
): Promise<T[]> {
  const env = getEnv();
  const url = env.SUPABASE_URL || 'https://yqwcodxrouaahuhgvcdj.supabase.co';
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || '';
  const prefer = ['return=representation'];
  if (opts?.deduplicateBy) {
    prefer.push('resolution=merge-duplicates');
  }
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Prefer': prefer.join(', '),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase insert error: ${response.status} ${error}`);
  }
  return response.json();
}

export async function supabaseDelete(
  table: string,
  filter: string
): Promise<{ count: number }> {
  const env = getEnv();
  const url = env.SUPABASE_URL || 'https://yqwcodxrouaahuhgvcdj.supabase.co';
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || '';
  const response = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Prefer': 'return=representation',
    },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase delete error: ${response.status} ${error}`);
  }
  return { count: parseInt(response.headers.get('x-total-count') || '0') };
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client as object, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
