import { prisma } from '../utils/prisma.js';
import type { FaultLine, Coordinates } from '../../../shared/dist/types/index.js';

export async function getNearestFault(coordinates: Coordinates): Promise<FaultLine | null> {
  const result = await prisma.$queryRawUnsafe(`
    SELECT 
      id, name, type, max_magnitude as "maxMagnitude", 
      activity_level as "activityLevel", slip_rate as "slipRate",
      last_event as "lastEvent", source,
      ST_AsGeoJSON(geometry)::json as geometry,
      ST_Distance(
        geometry::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) / 1000 as distance_km
    FROM "fault_lines"
    WHERE type IN ('ACTIVE', 'MEGATHRUST')
    ORDER BY distance_km ASC
    LIMIT 1
  `, coordinates.longitude, coordinates.latitude) as any[];

  if (result.length === 0) return null;

  const fault = result[0];
  return {
    id: fault.id,
    name: fault.name,
    type: fault.type.toLowerCase() as any,
    geometry: fault.geometry,
    maxMagnitude: fault.maxMagnitude,
    activityLevel: fault.activityLevel,
    slipRate: fault.slipRate,
    lastEvent: fault.lastEvent?.toISOString(),
    distanceKm: fault.distance_km,
  };
}

export async function getFaultsInRadius(
  coordinates: Coordinates, 
  radiusKm: number
): Promise<FaultLine[]> {
  const result = await prisma.$queryRawUnsafe(`
    SELECT 
      id, name, type, max_magnitude as "maxMagnitude", 
      activity_level as "activityLevel", slip_rate as "slipRate",
      last_event as "lastEvent", source,
      ST_AsGeoJSON(geometry)::json as geometry,
      ST_Distance(
        geometry::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) / 1000 as distance_km
    FROM "fault_lines"
    WHERE ST_DWithin(
      geometry,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3
    )
    ORDER BY distance_km ASC
  `, coordinates.longitude, coordinates.latitude, radiusKm * 1000) as any[];

  return result.map((fault: any) => ({
    id: fault.id,
    name: fault.name,
    type: fault.type.toLowerCase() as any,
    geometry: fault.geometry,
    maxMagnitude: fault.maxMagnitude,
    activityLevel: fault.activityLevel,
    slipRate: fault.slipRate,
    lastEvent: fault.lastEvent?.toISOString(),
    distanceKm: fault.distance_km,
  }));
}

export async function getAllFaults(): Promise<FaultLine[]> {
  const result = await prisma.$queryRawUnsafe(`
    SELECT 
      id, name, type, max_magnitude as "maxMagnitude", 
      activity_level as "activityLevel", slip_rate as "slipRate",
      last_event as "lastEvent", source,
      ST_AsGeoJSON(geometry)::json as geometry
    FROM "fault_lines"
    ORDER BY activity_level DESC, max_magnitude DESC
  `) as any[];

  return result.map((fault: any) => ({
    id: fault.id,
    name: fault.name,
    type: fault.type.toLowerCase() as any,
    geometry: fault.geometry,
    maxMagnitude: fault.maxMagnitude,
    activityLevel: fault.activityLevel,
    slipRate: fault.slipRate,
    lastEvent: fault.lastEvent?.toISOString(),
  }));
}