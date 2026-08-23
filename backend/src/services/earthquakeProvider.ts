import { prisma } from '../utils/prisma.js';
import { XMLParser } from 'fast-xml-parser';
import { getEnv } from '../config/env.js';

const logger = {
  info: (obj: unknown, msg: string) => console.log(`[INFO] ${msg}`, obj),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (obj: unknown, msg: string) => console.error(`[ERROR] ${msg}`, obj),
};

interface BMKGEvent {
  Tanggal: string;
  Jam: string;
  DateTime: string;
  Coordinates: string;
  Lintang: string;
  Bujur: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Potensi: string;
}

interface USGSEvent {
  type: 'Feature';
  properties: {
    mag: number;
    place: string;
    time: number;
    felt: number | null;
    tsunami: number;
    url: string;
    code: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number, number];
  };
  id: string;
}

const ID_MONTHS: Record<string, number> = {
  Jan: 0, Peb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5,
  Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11,
  Januari: 0, Februari: 1, Maret: 2, April: 3, Juni: 5,
  Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11,
};

/**
 * Parse BMKG date. Handles:
 * - ISO 8601 DateTime (preferred): 2026-08-22T01:31:00+00:00
 * - Indonesian format: 22 Agu 226 / 08:31:00 WIB
 * - Legacy slash format: 22/08/2026 / 08:31:00
 */
function parseBMKGDateTime(isoStr: string, dateStr: string, timeStr: string): Date {
  if (isoStr) {
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) return d;
  }

  const indoMatch = dateStr.match(/(\d+)\s+(\w+)\s+(\d{4})/);
  if (indoMatch) {
    const day = parseInt(indoMatch[1]);
    const month = ID_MONTHS[indoMatch[2]] ?? 0;
    const year = parseInt(indoMatch[3]);
    const timeParts = timeStr.replace(/\s*WIB|\s*WITA|\s*WIT/gi, '').split(':').map(Number);
    return new Date(year, month, day, timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0);
  }

  const [day, month, year] = dateStr.split('/').map(Number);
  const [hour, minute, second] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

function parseBMKGCoordinates(coordStr: string): { lat: number; lng: number } {
  const parts = coordStr.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // Fallback: DMS format "8°03'00" S"
  const parseDMS = (dms: string): number => {
    const match = dms.match(/(\d+)°(\d+)'(\d+\.?\d*)"([NSWE])/);
    if (!match) return 0;
    const [, deg, min, sec, dir] = match;
    let val = parseInt(deg) + parseInt(min) / 60 + parseFloat(sec) / 3600;
    if (dir === 'S' || dir === 'W') val = -val;
    return val;
  };

  return {
    lat: parseDMS(parts[0] || ''),
    lng: parseDMS(parts[1] || ''),
  };
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

/**
 * Insert earthquake using raw SQL so PostGIS handles geometry via ST_SetSRID.
 */
async function insertEarthquake(params: {
  externalId: string;
  magnitude: number;
  depth: number;
  lng: number;
  lat: number;
  place: string;
  time: Date;
  source: string;
  felt: boolean;
  tsunami?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const {
    externalId, magnitude, depth, lng, lat, place,
    time, source, felt, tsunami = false, metadata = {},
  } = params;

  const metaJson = JSON.stringify(metadata).replace(/'/g, "''");

  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO earthquake_events
        ("id", "externalId", "magnitude", "depth", "location", "place", "time", "source", "felt", "tsunami", "metadata", "createdAt")
      VALUES
        (gen_random_uuid()::text, $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geometry, $6, $7, $8::"EventSource", $9, $10, $11::jsonb, NOW())
      ON CONFLICT ("externalId") DO NOTHING
    `, externalId, magnitude, depth, lng, lat, place, time, source, felt, tsunami, metaJson);
    return true;
  } catch (e: any) {
    logger.error({ error: e.message, externalId }, 'Failed to insert earthquake');
    return false;
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(10_000) });
}

export async function fetchBMKGEvents(): Promise<number> {
  try {
    const response = await fetchWithTimeout(getEnv().BMKG_API_URL);
    if (!response.ok) {
      logger.error({ status: response.status }, 'BMKG feed returned non-OK status');
      return 0;
    }

    const xml = await response.text();
    const parsed = xmlParser.parse(xml);

    const gempaElements = parsed?.Infogempa?.gempa;
    if (!gempaElements) {
      logger.warn('No gempa elements found in BMKG response');
      return 0;
    }

    const gempaArray = Array.isArray(gempaElements) ? gempaElements : [gempaElements];
    let saved = 0;

    for (const gempa of gempaArray) {
      // New BMKG format: coordinates inside <point><coordinates>, old format: <Coordinates>
      const coordinates = gempa.point?.coordinates || gempa.Coordinates || '';

      const event: BMKGEvent = {
        Tanggal: gempa.Tanggal || '',
        Jam: gempa.Jam || '',
        DateTime: gempa.DateTime || '',
        Coordinates: coordinates,
        Lintang: gempa.Lintang || '',
        Bujur: gempa.Bujur || '',
        Magnitude: gempa.Magnitude || '',
        Kedalaman: (gempa.Kedalaman || '').replace(/\s*km$/i, ''),
        Wilayah: gempa.Wilayah || '',
        Potensi: gempa.Potensi || '',
      };

      if (!event.Magnitude || !event.Coordinates) continue;

      const magnitude = parseFloat(event.Magnitude);
      if (magnitude < 3.0) continue;

      const { lat, lng } = parseBMKGCoordinates(event.Coordinates);
      if (lat === 0 && lng === 0) continue;

      const time = parseBMKGDateTime(event.DateTime, event.Tanggal, event.Jam);
      const externalId = `bmkg-${time.getTime()}-${lat.toFixed(4)}-${lng.toFixed(4)}`;

      const inserted = await insertEarthquake({
        externalId,
        magnitude,
        depth: parseFloat(event.Kedalaman) || 10,
        lng,
        lat,
        place: event.Wilayah,
        time,
        source: 'BMKG',
        felt: true,
        metadata: {
          lintang: event.Lintang,
          bujur: event.Bujur,
          potensi: event.Potensi,
        },
      });
      if (inserted) saved++;
    }

    logger.info({ count: saved }, 'BMKG events fetched');
    return saved;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch BMKG events');
    return 0;
  }
}

export async function fetchUSGSEvents(): Promise<number> {
  try {
    const response = await fetchWithTimeout(getEnv().USGS_API_URL);
    if (!response.ok) {
      logger.error({ status: response.status }, 'USGS feed returned non-OK status');
      return 0;
    }

    const data = await response.json() as { features: USGSEvent[] };
    let saved = 0;

    for (const feature of data.features) {
      const { properties, geometry, id } = feature;

      if (!properties.mag || properties.mag < 3.0) continue;
      if (!geometry.coordinates) continue;

      const [lng, lat, depth] = geometry.coordinates;
      const time = new Date(properties.time);
      const externalId = `usgs-${id}`;

      const inserted = await insertEarthquake({
        externalId,
        magnitude: properties.mag,
        depth: depth || 10,
        lng,
        lat,
        place: properties.place,
        time,
        source: 'USGS',
        felt: (properties.felt ?? 0) > 0,
        tsunami: properties.tsunami === 1,
        metadata: {
          url: properties.url,
          code: properties.code,
        },
      });
      if (inserted) saved++;
    }

    logger.info({ count: saved }, 'USGS events fetched');
    return saved;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch USGS events');
    return 0;
  }
}
