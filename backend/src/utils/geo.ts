/**
 * PostGIS geometry helpers for Prisma.
 *
 * Prisma maps PostGIS columns to `Bytes`, but doesn't natively understand
 * GeoJSON → WKB conversion. These helpers use ST_GeomFromText / ST_MakePoint
 * via $executeRaw so the database handles the conversion.
 *
 * Usage with Prisma create:
 * ```ts
 * await prisma.earthquakeEvent.create({
 *   data: {
 *     ...otherFields,
 *     location: pointGeometry(lng, lat) as any,
 *   },
 * });
 * ```
 *
 * ⚠️ The above won't work because Prisma validates the Bytes type at client level.
 * Instead, use `createWithGeometry` below which uses raw SQL.
 */

import { prisma } from './prisma.js';

/**
 * Build a raw SQL fragment for a PostGIS Point geometry.
 */
export function pointWKT(lng: number, lat: number): string {
  return `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geometry`;
}

/**
 * Build a raw SQL fragment for a PostGIS LineString geometry from coordinate pairs.
 */
export function lineStringWKT(coords: [number, number][]): string {
  const points = coords.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `ST_GeomFromText('LINESTRING(${points})', 4326)`;
}

/**
 * Build a raw SQL fragment for a PostGIS Polygon geometry from coordinate ring.
 */
export function polygonWKT(coords: [number, number][]): string {
  const ring = coords.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `ST_GeomFromText('POLYGON((${ring}))', 4326)`;
}
