import { prisma } from '../utils/prisma.js';
import type { SoilType, Coordinates } from '../../../shared/dist/types/index.js';

export async function getSoilTypeAtLocation(coordinates: Coordinates): Promise<SoilType | null> {
  const result = await prisma.$queryRawUnsafe(`
    SELECT 
      id, name, code, liquefaction_risk as "liquefactionRisk",
      description, vs30, source, metadata,
      ST_AsGeoJSON(geometry)::json as geometry
    FROM "soil_types"
    WHERE ST_Contains(
      geometry,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)
    )
    ORDER BY 
      CASE liquefaction_risk 
        WHEN 'CRITICAL' THEN 4
        WHEN 'HIGH' THEN 3
        WHEN 'MEDIUM' THEN 2
        ELSE 1
      END DESC
    LIMIT 1
  `, coordinates.longitude, coordinates.latitude) as any[];

  if (result.length === 0) return null;

  const soil = result[0];
  return {
    id: soil.id,
    name: soil.name,
    code: soil.code,
    liquefactionRisk: soil.liquefactionRisk.toLowerCase() as any,
    description: soil.description,
    vs30: soil.vs30,
    geometry: soil.geometry,
  };
}

export async function getAllSoilTypes(): Promise<SoilType[]> {
  const result = await prisma.$queryRawUnsafe(`
    SELECT 
      id, name, code, liquefaction_risk as "liquefactionRisk",
      description, vs30, source, metadata,
      ST_AsGeoJSON(geometry)::json as geometry
    FROM "soil_types"
    ORDER BY name
  `) as any[];

  return result.map((soil: any) => ({
    id: soil.id,
    name: soil.name,
    code: soil.code,
    liquefactionRisk: soil.liquefactionRisk.toLowerCase() as any,
    description: soil.description,
    vs30: soil.vs30,
    geometry: soil.geometry,
  }));
}