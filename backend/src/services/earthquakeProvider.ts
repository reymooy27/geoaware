import axios from 'axios';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { XMLParser } from 'fast-xml-parser';

const logger = {
  info: (obj: any, msg: string) => console.log(`[INFO] ${msg}`, obj),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (obj: any, msg: string) => console.error(`[ERROR] ${msg}`, obj),
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

function parseBMKGDate(dateStr: string, timeStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  const [hour, minute, second] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

function parseBMKGCoordinates(coordStr: string): { lat: number; lng: number } {
  const [latStr, lngStr] = coordStr.split(',').map(s => s.trim());
  
  const parseDMS = (dms: string): number => {
    const match = dms.match(/(\d+)°(\d+)'(\d+\.?\d*)"([NSWE])/);
    if (!match) return 0;
    const [, deg, min, sec, dir] = match;
    let val = parseInt(deg) + parseInt(min) / 60 + parseFloat(sec) / 3600;
    if (dir === 'S' || dir === 'W') val = -val;
    return val;
  };

  return {
    lat: parseDMS(latStr),
    lng: parseDMS(lngStr),
  };
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

export async function fetchBMKGEvents(): Promise<number> {
  try {
    const response = await axios.get('https://data.bmkg.go.id/gempadirasakan.xml', {
      timeout: 10000,
      headers: { 'Accept': 'application/xml' },
    });

    const xml = response.data;
    const parsed = xmlParser.parse(xml);
    
    const gempaElements = parsed?.Infogempa?.gempa;
    if (!gempaElements) {
      logger.warn('No gempa elements found in BMKG response');
      return 0;
    }
    
    const gempaArray = Array.isArray(gempaElements) ? gempaElements : [gempaElements];
    let saved = 0;

    for (const gempa of gempaArray) {
      const event: BMKGEvent = {
        Tanggal: gempa.Tanggal || '',
        Jam: gempa.Jam || '',
        DateTime: gempa.DateTime || '',
        Coordinates: gempa.Coordinates || '',
        Lintang: gempa.Lintang || '',
        Bujur: gempa.Bujur || '',
        Magnitude: gempa.Magnitude || '',
        Kedalaman: gempa.Kedalaman || '',
        Wilayah: gempa.Wilayah || '',
        Potensi: gempa.Potensi || '',
      };

      if (!event.Magnitude || !event.Coordinates) continue;

      const magnitude = parseFloat(event.Magnitude);
      if (magnitude < 3.0) continue;

      const { lat, lng } = parseBMKGCoordinates(event.Coordinates);
      if (lat === 0 && lng === 0) continue;

      const time = parseBMKGDate(event.Tanggal, event.Jam);
      const externalId = `bmkg-${time.getTime()}-${lat.toFixed(4)}-${lng.toFixed(4)}`;

      try {
        await prisma.earthquakeEvent.create({
          data: {
            externalId,
            magnitude,
            depth: parseFloat(event.Kedalaman) || 10,
            location: { type: 'Point', coordinates: [lng, lat] },
            place: event.Wilayah,
            time,
            source: 'BMKG',
            felt: true,
            metadata: {
              lintang: event.Lintang,
              bujur: event.Bujur,
              potensi: event.Potensi,
            },
          },
        });
        saved++;
      } catch (e: any) {
        if (e.code !== 'P2002') throw e;
      }
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
    const response = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson', {
      timeout: 10000,
    });

    const data = response.data as { features: USGSEvent[] };
    let saved = 0;

    for (const feature of data.features) {
      const { properties, geometry, id } = feature;
      
      if (!properties.mag || properties.mag < 3.0) continue;
      if (!geometry.coordinates) continue;

      const [lng, lat, depth] = geometry.coordinates;
      const time = new Date(properties.time);
      const externalId = `usgs-${id}`;

      try {
        await prisma.earthquakeEvent.create({
          data: {
            externalId,
            magnitude: properties.mag,
            depth: depth || 10,
            location: { type: 'Point', coordinates: [lng, lat] },
            place: properties.place,
            time,
            source: 'USGS',
            felt: (properties.felt ?? 0) > 0,
            tsunami: properties.tsunami === 1,
            metadata: {
              url: properties.url,
              code: properties.code,
            },
          },
        });
        saved++;
      } catch (e: any) {
        if (e.code !== 'P2002') throw e;
      }
    }

    logger.info({ count: saved }, 'USGS events fetched');
    return saved;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch USGS events');
    return 0;
  }
}