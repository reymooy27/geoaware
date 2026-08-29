import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import type { Env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { fetchBMKGEvents, fetchUSGSEvents } from '../services/earthquakeProvider.js';

/** Convert PostGIS WKB bytes from Prisma to {longitude, latitude}. */
function parseGeometry(buf: Uint8Array | null): { longitude: number; latitude: number } | null {
  if (!buf) return null;
  if (buf.length < 25) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const lng = view.getFloat64(9, true);
  const lat = view.getFloat64(17, true);
  return { longitude: lng, latitude: lat };
}

/** Simple in-memory cache (per-isolate, survives warm requests). */
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function getCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

/** Build cache key from query params. */
function cacheKey(params: any): string {
  return JSON.stringify(params);
}

export const earthquakeRoutes = new Hono<Env>();

const querySchema = z.object({
  minMagnitude: z.coerce.number().min(0).max(10).default(3.0),
  maxMagnitude: z.coerce.number().min(0).max(10).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(1000).optional(),
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
    const where: any = { magnitude: { gte: params.minMagnitude } };
    if (params.maxMagnitude) where.magnitude.lte = params.maxMagnitude;
    if (params.startDate || params.endDate) {
      where.time = {};
      if (params.startDate) where.time.gte = new Date(params.startDate);
      if (params.endDate) where.time.lte = new Date(params.endDate);
    }
    if (params.source !== 'ALL') where.source = params.source;
    if (params.place) {
      where.place = { contains: params.place, mode: 'insensitive' };
    }

    let result: any;

    if (params.latitude && params.longitude && params.radiusKm) {
      const placeFilter = params.place ? `AND place ILIKE '%${params.place.replace(/'/g, "''")}%'` : '';
      const events = await prisma.$queryRawUnsafe(`
        SELECT * FROM "earthquake_events"
        WHERE ST_DWithin("location", ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
        AND magnitude >= $4
        ${params.maxMagnitude ? 'AND magnitude <= $5' : ''}
        ${params.source !== 'ALL' ? `AND source = '${params.source}'` : ''}
        ${placeFilter}
        ORDER BY time DESC
        LIMIT $${params.maxMagnitude ? 6 : 5} OFFSET $${params.maxMagnitude ? 7 : 6}
      `, params.longitude, params.latitude, params.radiusKm * 1000, params.minMagnitude,
        ...(params.maxMagnitude ? [params.maxMagnitude] : []), params.limit, params.offset) as any[];

      result = {
        events: events.map(e => ({ ...e, location: parseGeometry(e.location) })),
        total: events.length,
        limit: params.limit,
        offset: params.offset,
      };
    } else {
      const [events, total] = await Promise.all([
        prisma.earthquakeEvent.findMany({ where, orderBy: { time: 'desc' }, take: params.limit, skip: params.offset }),
        prisma.earthquakeEvent.count({ where }),
      ]);
      result = {
        events: events.map(e => ({ ...e, location: parseGeometry(e.location as unknown as Uint8Array) })),
        total, limit: params.limit, offset: params.offset,
      };
    }

    setCache(key, result);
    return c.json(result);
  } catch (err) {
    console.error('[earthquakes] query failed:', err);
    throw new AppError(500, 'Failed to fetch earthquakes', 'EARTHQUAKE_QUERY_FAILED');
  }
});

earthquakeRoutes.get('/latest', async (c) => {
  const event = await prisma.earthquakeEvent.findFirst({
    where: { magnitude: { gte: 3.0 } },
    orderBy: { time: 'desc' },
  });

  if (!event) {
    throw new AppError(404, 'No recent earthquakes found', 'NO_EVENTS');
  }

  return c.json(event);
});

earthquakeRoutes.post('/sync', async (c) => {
  const [bmkgCount, usgsCount] = await Promise.all([
    fetchBMKGEvents(),
    fetchUSGSEvents(),
  ]);

  return c.json({ synced: { bmkg: bmkgCount, usgs: usgsCount } });
});

earthquakeRoutes.get('/stats', async (c) => {
  const { days = '30' } = c.req.query();
  const daysNum = parseInt(days) || 30;
  const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

  const [byMagnitude, bySource, byDay] = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT
        CASE
          WHEN magnitude < 3 THEN '< 3.0'
          WHEN magnitude < 4 THEN '3.0 - 3.9'
          WHEN magnitude < 5 THEN '4.0 - 4.9'
          WHEN magnitude < 6 THEN '5.0 - 5.9'
          WHEN magnitude < 7 THEN '6.0 - 6.9'
          ELSE '>= 7.0'
        END as range,
        COUNT(*) as count
      FROM "earthquake_events"
      WHERE time >= $1
      GROUP BY range
      ORDER BY range
    `, since) as unknown as any[],
    prisma.earthquakeEvent.groupBy({
      by: ['source'],
      where: { time: { gte: since } },
      _count: true,
    }),
    prisma.$queryRawUnsafe(`
      SELECT DATE(time) as date, COUNT(*) as count
      FROM "earthquake_events"
      WHERE time >= $1
      GROUP BY DATE(time)
      ORDER BY date
    `, since) as unknown as any[],
  ]);

  return c.json({ byMagnitude, bySource, byDay });
});

earthquakeRoutes.get('/map', async (c) => {
  try {
    const params = z.object({
      minMagnitude: z.coerce.number().min(0).max(10).default(3.0),
      maxMagnitude: z.coerce.number().min(0).max(10).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      source: z.enum(['BMKG', 'USGS', 'ALL']).default('ALL'),
      place: z.string().optional(),
      limit: z.coerce.number().min(1).max(500).default(500),
    }).parse(c.req.query());

    const key = `map:${JSON.stringify(params)}`;
    const cached = getCache(key);
    if (cached) return c.json(cached);

    const where: any = { magnitude: { gte: params.minMagnitude } };
    if (params.maxMagnitude) where.magnitude.lte = params.maxMagnitude;
    if (params.startDate || params.endDate) {
      where.time = {};
      if (params.startDate) where.time.gte = new Date(params.startDate);
      if (params.endDate) where.time.lte = new Date(params.endDate);
    }
    if (params.source !== 'ALL') where.source = params.source;
    if (params.place) {
      where.place = { contains: params.place, mode: 'insensitive' };
    }

    const events = await prisma.earthquakeEvent.findMany({
      where,
      orderBy: { time: 'desc' },
      take: params.limit,
      select: {
        id: true,
        magnitude: true,
        place: true,
        time: true,
        source: true,
        location: true,
      },
    });

    const result = {
      events: events.map(e => ({
        id: e.id,
        magnitude: e.magnitude,
        place: e.place,
        time: e.time,
        source: e.source,
        location: parseGeometry(e.location as unknown as Uint8Array),
      })),
    };

    setCache(key, result);
    return c.json(result);
  } catch (err) {
    console.error('[earthquakes/map] query failed:', err);
    throw new AppError(500, 'Failed to fetch map earthquakes', 'EARTHQUAKE_MAP_QUERY_FAILED');
  }
});
