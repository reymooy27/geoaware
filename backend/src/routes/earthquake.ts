import { Hono } from 'hono';
import { z } from 'zod';
import { prisma, query } from '../utils/prisma.js';
import { getEnv } from '../config/env.js';
import type { Env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { fetchBMKGEvents, fetchUSGSEvents } from '../services/earthquakeProvider.js';

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

function parseGeometry(buf: Uint8Array | null): { longitude: number; latitude: number } | null {
  try {
    if (!buf || buf.length < 25) return null;
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    // PostGIS WKB: byte 0 = endian, bytes 1-4 = type (0x20000001 = Point+SRID), bytes 4-8 = SRID, bytes 8-16 = X, bytes 16-24 = Y
    const lng = view.getFloat64(8, true);
    const lat = view.getFloat64(16, true);
    if (isNaN(lng) || isNaN(lat)) return null;
    return { longitude: lng, latitude: lat };
  } catch { return null; }
}

function parseGeometryHex(hex: any): { longitude: number; latitude: number } | null {
  try {
    if (!hex || typeof hex !== 'string') return null;

    // Decode from PostGIS hex string format (\x...)
    let clean = hex.replace(/^\\x/, '').replace(/^0x/, '');

    // Try decoding as WKT text (hex-encoded POINT)
    try {
      const textBytes = new Uint8Array(clean.length / 2);
      for (let i = 0; i < textBytes.length; i++) {
        textBytes[i] = parseInt(clean.substr(i * 2, 2), 16);
      }
      const decoded = new TextDecoder().decode(textBytes);
      const wktMatch = decoded.match(/POINT\s*\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)/i);
      if (wktMatch) {
        const lng = parseFloat(wktMatch[1]);
        const lat = parseFloat(wktMatch[2]);
        if (!isNaN(lng) && !isNaN(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90) {
          return { longitude: lng, latitude: lat };
        }
      }
    } catch { /* not a valid text encoding, fall through to WKB */ }

    if (clean.length < 25) return null;
    const bytes = hexToBytes(clean);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const lng = view.getFloat64(8, true);
    const lat = view.getFloat64(16, true);
    if (isNaN(lng) || isNaN(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      const lng2 = view.getFloat64(9, true);
      const lat2 = view.getFloat64(17, true);
      if (!isNaN(lng2) && !isNaN(lat2) && Math.abs(lng2) <= 180 && Math.abs(lat2) <= 90) {
        return { longitude: lng2, latitude: lat2 };
      }
      return null;
    }
    return { longitude: lng, latitude: lat };
  } catch { return null; }
}

const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 30_000;
function getCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key: string, data: any): void { cache.set(key, { data, expires: Date.now() + CACHE_TTL }); }
function cacheKey(params: any): string { return JSON.stringify(params); }

export const earthquakeRoutes = new Hono<Env>();

const querySchema = z.object({
  minMagnitude: z.coerce.number().min(0).max(10).default(3.0),
  maxMagnitude: z.coerce.number().min(0).max(10).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  source: z.enum(['BMKG', 'USGS', 'ALL']).default('ALL'),
  place: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(20),
  offset: z.coerce.number().min(0).default(0),
});

earthquakeRoutes.get('/', async (c) => {
  const params = querySchema.parse(c.req.query());
  const key = cacheKey(params);
  const cached = getCache(key);
  if (cached) return c.json(cached);
  try {
    const filters: string[] = [`magnitude=gte.${params.minMagnitude}`];
    if (params.maxMagnitude != null) filters.push(`magnitude=lte.${params.maxMagnitude}`);
    if (params.startDate) filters.push(`time=gte.${params.startDate}`);
    if (params.endDate) filters.push(`time=lte.${params.endDate}`);
    if (params.source && params.source !== 'ALL') filters.push(`source=eq.${params.source}`);
    if (params.place) filters.push(`place=ilike.*${params.place}*`);
    const path = `earthquake_events?select=*&order=time.desc&limit=${params.limit}&offset=${params.offset}&${filters.join('&')}`;
    const events = await query(path);
    const result = { events: events.map((e: any) => ({ ...e, location: parseGeometryHex(e.location) })), total: events.length, limit: params.limit, offset: params.offset };
    setCache(key, result);
    return c.json(result);
  } catch (err: any) {
    throw new AppError(500, 'Failed to fetch earthquakes', 'EARTHQUAKE_QUERY_FAILED', err.message);
  }
});

earthquakeRoutes.get('/latest', async (c) => {
  try {
    const events = await query('earthquake_events?select=*&order=time.desc&magnitude=gte.3.0&limit=1');
    if (events.length === 0) throw new AppError(404, 'No recent earthquakes found', 'NO_EVENTS');
    return c.json({ ...events[0], location: parseGeometryHex(events[0].location) });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, 'Failed to fetch latest earthquake', 'LATEST_EARTHQUAKE_FAILED', err.message);
  }
});

earthquakeRoutes.post('/sync', async (c) => {
  const [bmkgCount, usgsCount] = await Promise.all([fetchBMKGEvents(), fetchUSGSEvents()]);
  return c.json({ synced: { bmkg: bmkgCount, usgs: usgsCount } });
});

earthquakeRoutes.get('/stats', async (c) => {
  const daysNum = parseInt(c.req.query().days || '30') || 30;
  const since = new Date(Date.now() - daysNum * 86400000).toISOString();
  try {
    const events = await query(`earthquake_events?select=*&time=gte.${since}`);
    return c.json({ count: events.length });
  } catch (err: any) {
    throw new AppError(500, 'Failed to fetch stats', 'STATS_FAILED', err.message);
  }
});

earthquakeRoutes.get('/map', async (c) => {
  const params = z.object({
    minMagnitude: z.coerce.number().min(0).max(10).default(3.0),
    maxMagnitude: z.coerce.number().min(0).max(10).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    source: z.enum(['BMKG','USGS','ALL']).default('ALL'),
    place: z.string().optional(),
    limit: z.coerce.number().min(1).max(500).default(500)
  }).parse(c.req.query());
  const key = `map:${JSON.stringify(params)}`;
  const cached = getCache(key);
  if (cached) return c.json(cached);
  try {
    const filters = [`magnitude=gte.${params.minMagnitude}`];
    if (params.maxMagnitude != null) filters.push(`magnitude=lte.${params.maxMagnitude}`);
    if (params.startDate) filters.push(`time=gte.${params.startDate}`);
    if (params.endDate) filters.push(`time=lte.${params.endDate}`);
    if (params.source !== 'ALL') filters.push(`source=eq.${params.source}`);
    if (params.place) filters.push(`place=ilike.*${params.place}*`);
    const path = `earthquake_events?select=id,magnitude,place,time,source,location&order=time.desc&limit=${params.limit}&${filters.join('&')}`;
    const events = await query(path);
    const result = { events: events.map((e: any) => ({ id: e.id, magnitude: e.magnitude, place: e.place, time: e.time, source: e.source, location: parseGeometryHex(e.location) })) };
    setCache(key, result);
    return c.json(result);
  } catch (err: any) {
    throw new AppError(500, 'Failed to fetch map earthquakes', 'EARTHQUAKE_MAP_QUERY_FAILED', err.message);
  }
});
