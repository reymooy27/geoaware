import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import type { Env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

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

  let where = '';
  const values: any[] = [];
  let paramIndex = 1;

  if (params.type) {
    where += `WHERE type = $${paramIndex++}`;
    values.push(params.type);
  }

  if (params.latitude && params.longitude && params.radiusKm) {
    if (where) where += ' AND ';
    else where += ' WHERE ';
    where += `ST_DWithin(geometry, ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography, $${paramIndex + 2})`;
    values.push(params.longitude, params.latitude, params.radiusKm * 1000);
    paramIndex += 3;
  }

  const faults = await prisma.$queryRawUnsafe(`
    SELECT
      id, name, type, "maxMagnitude",
      "activityLevel", "slipRate",
      "lastEvent", source,
      ST_AsGeoJSON(geometry::geometry)::json as geometry
    FROM "fault_lines"
    ${where}
    ORDER BY "activityLevel" DESC, "maxMagnitude" DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `, ...values, params.limit, params.offset) as any[];

  const result = faults.map((fault: any) => ({
    id: fault.id,
    name: fault.name,
    type: fault.type.toLowerCase(),
    geometry: fault.geometry,
    maxMagnitude: fault.maxMagnitude,
    activityLevel: fault.activityLevel,
    slipRate: fault.slipRate,
    lastEvent: fault.lastEvent?.toISOString(),
  }));

  return c.json(result);
});

faultRoutes.get('/nearby/:latitude/:longitude', async (c) => {
  const latitude = parseFloat(c.req.param('latitude'));
  const longitude = parseFloat(c.req.param('longitude'));
  const { radiusKm = '50', limit = '5' } = c.req.query();

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new AppError(400, 'Invalid coordinates', 'INVALID_COORDINATES');
  }

  const faults = await prisma.$queryRawUnsafe(`
    SELECT
      id, name, type, "maxMagnitude",
      "activityLevel",
      ST_Distance(
        geometry::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) / 1000 as distance_km,
      ST_AsGeoJSON(geometry::geometry)::json as geometry
    FROM "fault_lines"
    WHERE ST_DWithin(
      geometry,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3
    )
    ORDER BY distance_km ASC
    LIMIT $4
  `, longitude, latitude, parseFloat(radiusKm) * 1000, parseInt(limit)) as any[];

  const result = faults.map((fault: any) => ({
    id: fault.id,
    name: fault.name,
    type: fault.type.toLowerCase(),
    geometry: fault.geometry,
    maxMagnitude: fault.maxMagnitude,
    activityLevel: fault.activityLevel,
    slipRate: fault.slipRate,
    lastEvent: fault.lastEvent?.toISOString(),
    distanceKm: fault.distance_km,
  }));

  return c.json(result);
});

faultRoutes.get('/:faultId', async (c) => {
  const { faultId } = c.req.param();

  const fault = await prisma.$queryRawUnsafe(`
    SELECT
      id, name, type, "maxMagnitude",
      "activityLevel", "slipRate",
      "lastEvent", source, metadata,
      ST_AsGeoJSON(geometry::geometry)::json as geometry
    FROM "fault_lines"
    WHERE id = $1
  `, faultId) as any[];

  if (fault.length === 0) {
    throw new AppError(404, 'Fault line not found', 'FAULT_NOT_FOUND');
  }

  const f = fault[0];
  return c.json({
    id: f.id,
    name: f.name,
    type: f.type.toLowerCase(),
    geometry: f.geometry,
    maxMagnitude: f.maxMagnitude,
    activityLevel: f.activityLevel,
    slipRate: f.slipRate,
    lastEvent: f.lastEvent?.toISOString(),
    source: f.source,
    metadata: f.metadata,
  });
});
