import { Hono } from 'hono';
import { z } from 'zod';
import { query, wkbToGeoJSON } from '../utils/prisma.js';
import type { Env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import type { FaultLine } from '../../../shared/dist/types/index.js';

export const faultRoutes = new Hono<Env>();

const querySchema = z.object({
  type: z.enum(['ACTIVE', 'MEGATHRUST', 'INACTIVE']).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(500).optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

faultRoutes.get('/', async (c) => {
  const params = querySchema.parse(c.req.query());

  let path = 'fault_lines?select=*&order=activityLevel.desc,maxMagnitude.desc';

  const filters: string[] = [];
  if (params.type) filters.push(`type=eq.${params.type}`);
  if (filters.length) path += `&${filters.join('&')}`;

  const faults = await query(path) as any[];

  let result = faults.map((fault: any) => ({
    id: fault.id,
    name: fault.name,
    type: fault.type.toLowerCase(),
    geometry: wkbToGeoJSON(fault.geometry),
    maxMagnitude: fault.maxMagnitude,
    activityLevel: fault.activityLevel,
    slipRate: fault.slipRate,
    lastEvent: fault.lastEvent?.toISOString(),
  }));

  if (params.latitude && params.longitude && params.radiusKm) {
    const radiusM = params.radiusKm * 1000;
    result = result.filter((f) => {
      if (!f.geometry || f.geometry.type !== 'LineString') return false;
      return lineStringWithinRadius(f.geometry.coordinates, params.longitude!, params.latitude!, radiusM);
    }).slice(0, params.limit);
  }

  result = result.slice(params.offset, params.offset + params.limit);
  return c.json(result);
});

faultRoutes.get('/nearby/:latitude/:longitude', async (c) => {
  const latitude = parseFloat(c.req.param('latitude'));
  const longitude = parseFloat(c.req.param('longitude'));
  const { radiusKm = '50', limit = '5' } = c.req.query();

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new AppError(400, 'Invalid coordinates', 'INVALID_COORDINATES');
  }

  const faults = await query('fault_lines?select=*&order=name') as any[];

  const radiusM = parseFloat(radiusKm) * 1000;
  const result = faults
    .map((fault: any) => {
      const geom = wkbToGeoJSON(fault.geometry);
      if (!geom || geom.type !== 'LineString') return null;
      const dist = lineStringToPointDistance(geom.coordinates, longitude, latitude);
      return {
        id: fault.id,
        name: fault.name,
        type: fault.type.toLowerCase(),
        geometry: geom,
        maxMagnitude: fault.maxMagnitude,
        activityLevel: fault.activityLevel,
        slipRate: fault.slipRate,
        lastEvent: fault.lastEvent?.toISOString(),
        distanceKm: dist === null ? 999999 : dist / 1000,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .filter((f) => f.distanceKm < radiusM / 1000)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, parseInt(limit));

  return c.json(result);
});

faultRoutes.get('/:faultId', async (c) => {
  const { faultId } = c.req.param();

  const faults = await query(`fault_lines?select=*&id=eq.${faultId}&limit=1`) as any[];

  if (faults.length === 0) {
    throw new AppError(404, 'Fault line not found', 'FAULT_NOT_FOUND');
  }

  const f = faults[0];
  return c.json({
    id: f.id,
    name: f.name,
    type: f.type.toLowerCase(),
    geometry: wkbToGeoJSON(f.geometry),
    maxMagnitude: f.maxMagnitude,
    activityLevel: f.activityLevel,
    slipRate: f.slipRate,
    lastEvent: f.lastEvent?.toISOString(),
    source: f.source,
    metadata: f.metadata,
  });
});

function lineStringWithinRadius(
  coords: number[][], lng: number, lat: number, radiusM: number
): boolean {
  const d = lineStringToPointDistance(coords, lng, lat);
  return d !== null && d < radiusM;
}

function lineStringToPointDistance(
  lineCoords: number[][], lng: number, lat: number
): number | null {
  if (lineCoords.length === 0) return null;

  // Simple: compute minimum distance to any vertex (sufficient for filtering small line strings)
  // Uses haversine for accuracy
  let minDist = Infinity;
  for (const [x, y] of lineCoords) {
    const d = haversine(y, x, lat, lng); // (lat, lng)
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
