import { query, wkbToGeoJSON } from '../utils/prisma.js';
import type { SoilType, Coordinates } from '../../../shared/dist/types/index.js';
import type { Feature } from 'geojson';

function pointInPolygon(px: number, py: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function distanceToLine(lat: number, lng: number, coords: number[][]): number | null {
  if (coords.length === 0) return null;
  let minDist = Infinity;
  for (const [lon, latPt] of coords) {
    const d = haversine(lat, lng, latPt, lon);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export async function getSoilTypeAtLocation(coordinates: Coordinates): Promise<SoilType | null> {
  const soils = await query('soil_types?select=*&order=name') as any[];
  if (soils.length === 0) return null;

  // Filter by point-in-polygon, pick the highest risk
  const riskOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  let best: SoilType | null = null;
  let bestRisk = 0;

  for (const soil of soils) {
    const geom = wkbToGeoJSON(soil.geometry);
    if (!geom || geom.type !== 'Polygon') continue;
    // Check if point is within the polygon (exterior ring)
    const ring = geom.coordinates[0];
    if (pointInPolygon(coordinates.longitude, coordinates.latitude, ring)) {
      const risk = riskOrder[soil.liquefactionRisk] || 0;
      if (risk > bestRisk) {
        bestRisk = risk;
        best = {
          id: soil.id,
          name: soil.name,
          code: soil.code,
          liquefactionRisk: soil.liquefactionRisk.toLowerCase(),
          description: soil.description,
          vs30: soil.vs30,
          geometry: geom,
        };
      }
    }
  }

  return best;
}

export async function getAllSoilTypes(): Promise<SoilType[]> {
  const soils = await query('soil_types?select=*&order=name') as any[];
  return soils.map((soil: any) => ({
    id: soil.id,
    name: soil.name,
    code: soil.code,
    liquefactionRisk: soil.liquefactionRisk.toLowerCase(),
    description: soil.description,
    vs30: soil.vs30,
    geometry: wkbToGeoJSON(soil.geometry),
  }));
}
