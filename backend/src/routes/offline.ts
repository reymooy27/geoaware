import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const offlineRoutes = Router();

const regionSchema = z.object({
  name: z.string().min(1).max(100),
  minLat: z.number().min(-90).max(90),
  minLng: z.number().min(-180).max(180),
  maxLat: z.number().min(-90).max(90),
  maxLng: z.number().min(-180).max(180),
  minZoom: z.number().min(0).max(22).default(10),
  maxZoom: z.number().min(0).max(22).default(16),
});

offlineRoutes.get('/regions/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const regions = await prisma.offlineMapRegion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(regions);
  } catch (error) {
    next(error);
  }
});

offlineRoutes.post('/regions/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const data = regionSchema.parse(req.body);

    if (data.minLat >= data.maxLat || data.minLng >= data.maxLng) {
      throw new AppError(400, 'Invalid bounds', 'INVALID_BOUNDS');
    }

    const areaKm2 = calculateAreaKm2(data);
    const estimatedSizeMB = estimateTileSize(areaKm2, data.minZoom, data.maxZoom);

    if (estimatedSizeMB > 200) {
      throw new AppError(400, 'Region too large (max 200MB)', 'REGION_TOO_LARGE');
    }

    const polygonWkt = `POLYGON((${data.minLng} ${data.minLat}, ${data.maxLng} ${data.minLat}, ${data.maxLng} ${data.maxLat}, ${data.minLng} ${data.maxLat}, ${data.minLng} ${data.minLat}))`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [region] = await prisma.$queryRawUnsafe<[{ id: string }]>(`
      INSERT INTO offline_map_regions
        ("id", "userId", "name", "bounds", "minZoom", "maxZoom", "sizeMB", "downloadedAt", "expiresAt", "createdAt")
      VALUES
        (gen_random_uuid()::text, $1, $2, ST_GeomFromText('${polygonWkt}', 4326)::geometry, $3, $4, $5, $6, $7, NOW())
      RETURNING id
    `, userId, data.name, data.minZoom, data.maxZoom, estimatedSizeMB, new Date(), expiresAt);

    res.status(201).json(region);
  } catch (error) {
    next(error);
  }
});

offlineRoutes.delete('/regions/:regionId', async (req, res, next) => {
  try {
    const { regionId } = req.params;
    await prisma.offlineMapRegion.delete({ where: { id: regionId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

offlineRoutes.get('/evacuation-routes', async (req, res, next) => {
  try {
    const { latitude, longitude, radiusKm = '10' } = req.query;

    if (!latitude || !longitude) {
      throw new AppError(400, 'Latitude and longitude required', 'MISSING_COORDINATES');
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radius = parseFloat(radiusKm as string) * 1000;

    const routes = await prisma.$queryRawUnsafe(`
      SELECT 
        id, name, "assemblyName", "assemblyCapacity", 
        "distanceKm", "estimatedTimeMin",
        ST_AsGeoJSON(geometry::geometry)::json as geometry,
        ST_AsGeoJSON("assemblyPoint"::geometry)::json as assemblyPoint
      FROM "evacuation_routes"
      WHERE "isActive" = true
      AND ST_DWithin(
        "assemblyPoint",
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ORDER BY "distanceKm" ASC
      LIMIT 10
    `, lng, lat, radius) as any[];

    res.json(routes);
  } catch (error) {
    next(error);
  }
});

offlineRoutes.get('/assembly-points', async (req, res, next) => {
  try {
    const { latitude, longitude, radiusKm = '20' } = req.query;

    if (!latitude || !longitude) {
      throw new AppError(400, 'Latitude and longitude required', 'MISSING_COORDINATES');
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radius = parseFloat(radiusKm as string) * 1000;

    const points = await prisma.$queryRawUnsafe(`
      SELECT 
        id, name, address, capacity, facilities,
        ST_AsGeoJSON(location::geometry)::json as location
      FROM "assembly_points"
      WHERE "isActive" = true
      AND ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ORDER BY capacity DESC
      LIMIT 20
    `, lng, lat, radius) as any[];

    res.json(points);
  } catch (error) {
    next(error);
  }
});

function calculateAreaKm2(bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }): number {
  const R = 6371;
  const latDiff = (bounds.maxLat - bounds.minLat) * Math.PI / 180;
  const lngDiff = (bounds.maxLng - bounds.minLng) * Math.PI / 180;
  const avgLat = (bounds.maxLat + bounds.minLat) / 2 * Math.PI / 180;
  return R * R * latDiff * lngDiff * Math.cos(avgLat);
}

function estimateTileSize(areaKm2: number, minZoom: number, maxZoom: number): number {
  let totalTiles = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const tilesPerDegree = Math.pow(2, z) / 360;
    const tileAreaKm2 = (40075 * 40075) / Math.pow(2, 2 * z);
    totalTiles += Math.ceil(areaKm2 / tileAreaKm2);
  }
  return Math.round(totalTiles * 0.0005 * 100) / 100;
}