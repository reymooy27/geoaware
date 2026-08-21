import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const faultRoutes = Router();

const querySchema = z.object({
  type: z.enum(['ACTIVE', 'MEGATHRUST', 'INACTIVE']).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(500).optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

faultRoutes.get('/', async (req, res, next) => {
  try {
    const params = querySchema.parse(req.query);

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
        id, name, type, max_magnitude as "maxMagnitude", 
        activity_level as "activityLevel", slip_rate as "slipRate",
        last_event as "lastEvent", source,
        ST_AsGeoJSON(geometry)::json as geometry
      FROM "fault_lines"
      ${where}
      ORDER BY activity_level DESC, max_magnitude DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, ...values, params.limit, params.offset) as any[];

    res.json(faults);
  } catch (error) {
    next(error);
  }
});

faultRoutes.get('/:faultId', async (req, res, next) => {
  try {
    const { faultId } = req.params;

    const fault = await prisma.$queryRawUnsafe(`
      SELECT 
        id, name, type, max_magnitude as "maxMagnitude", 
        activity_level as "activityLevel", slip_rate as "slipRate",
        last_event as "lastEvent", source, metadata,
        ST_AsGeoJSON(geometry)::json as geometry
      FROM "fault_lines"
      WHERE id = $1
    `, faultId) as any[];

    if (fault.length === 0) {
      throw new AppError(404, 'Fault line not found', 'FAULT_NOT_FOUND');
    }

    res.json(fault[0]);
  } catch (error) {
    next(error);
  }
});

faultRoutes.get('/nearby/:latitude/:longitude', async (req, res, next) => {
  try {
    const latitude = parseFloat(req.params.latitude);
    const longitude = parseFloat(req.params.longitude);
    const { radiusKm = '50', limit = '5' } = req.query;

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new AppError(400, 'Invalid coordinates', 'INVALID_COORDINATES');
    }

    const faults = await prisma.$queryRawUnsafe(`
      SELECT 
        id, name, type, max_magnitude as "maxMagnitude", 
        activity_level as "activityLevel",
        ST_Distance(
          geometry::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000 as distance_km,
        ST_AsGeoJSON(geometry)::json as geometry
      FROM "fault_lines"
      WHERE ST_DWithin(
        geometry,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ORDER BY distance_km ASC
      LIMIT $4
    `, longitude, latitude, parseFloat(radiusKm as string) * 1000, parseInt(limit as string)) as any[];

    res.json(faults);
  } catch (error) {
    next(error);
  }
});