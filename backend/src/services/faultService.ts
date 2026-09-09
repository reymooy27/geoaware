import { query, wkbToGeoJSON } from '../utils/prisma.js';
import type { FaultLine, Coordinates } from '../../../shared/dist/types/index.js';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function lineStringToPointDistance(coords: number[][], lng: number, lat: number): number | null {
  if (!coords.length) return null;
  let minDist = Infinity;
  for (const [x, y] of coords) {
    const d = haversine(y, x, lat, lng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function wkbLineStringToCoords(hex: string): number[][] | null {
  const geom = wkbToGeoJSON(hex);
  if (!geom || geom.type !== 'LineString') return null;
  return geom.coordinates;
}

async function fetchAllFaults(): Promise<any[]> {
  return query('fault_lines?select=*') as Promise<any[]>;
}

export async function getNearestFault(coordinates: Coordinates): Promise<FaultLine | null> {
  const faults = await fetchAllFaults();
  let nearest: FaultLine | null = null;
  let minDist = Infinity;

  for (const f of faults) {
    const coords = wkbLineStringToCoords(f.geometry);
    if (!coords) continue;
    const dist = lineStringToPointDistance(coords, coordinates.longitude, coordinates.latitude);
    if (dist !== null && dist < minDist) {
      minDist = dist;
      nearest = {
        id: f.id,
        name: f.name,
        type: f.type.toLowerCase(),
        geometry: wkbToGeoJSON(f.geometry),
        maxMagnitude: f.maxMagnitude,
        activityLevel: f.activityLevel,
        slipRate: f.slipRate,
        lastEvent: f.lastEvent?.toISOString(),
        distanceKm: dist / 1000,
      };
    }
  }

  return nearest;
}

export async function getFaultsInRadius(
  coordinates: Coordinates,
  radiusKm: number
): Promise<FaultLine[]> {
  const faults = await fetchAllFaults();
  const radiusM = radiusKm * 1000;

  return faults
    .map((f) => {
      const coords = wkbLineStringToCoords(f.geometry);
      if (!coords) return null;
      const dist = lineStringToPointDistance(coords, coordinates.longitude, coordinates.latitude);
      if (dist === null || dist >= radiusM) return null;
      return {
        id: f.id,
        name: f.name,
        type: f.type.toLowerCase(),
        geometry: wkbToGeoJSON(f.geometry),
        maxMagnitude: f.maxMagnitude,
        activityLevel: f.activityLevel,
        slipRate: f.slipRate ?? undefined,
        lastEvent: f.lastEvent?.toISOString(),
        distanceKm: dist / 1000,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
}

export async function getAllFaults(): Promise<FaultLine[]> {
  const faults = await fetchAllFaults();
  return faults.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type.toLowerCase(),
    geometry: wkbToGeoJSON(f.geometry),
    maxMagnitude: f.maxMagnitude,
    activityLevel: f.activityLevel,
    slipRate: f.slipRate,
    lastEvent: f.lastEvent?.toISOString(),
  }));
}
