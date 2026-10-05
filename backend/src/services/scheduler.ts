import { supabaseDelete } from '../utils/prisma.js';
import { fetchBMKGEvents, fetchUSGSEvents } from './earthquakeProvider.js';
import { notifyEarthquake } from './notification.js';

const logger = {
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
  info: (obj: unknown, msg: string) => console.log(`[INFO] ${msg}`, obj),
};

export interface SyncResult {
  bmkg: number;
  usgs: number;
  totalNew: number;
}

/**
 * One polling cycle: fetch BMKG + USGS feeds, persist new events, push
 * notifications to matching subscribers. Invoked by the 5-minute Cron Trigger
 * and by POST /api/earthquakes/sync.
 */
export async function runEarthquakeSync(): Promise<SyncResult> {
  const [bmkg, usgs] = await Promise.all([fetchBMKGEvents(), fetchUSGSEvents()]);

  const newEvents = [...bmkg.events, ...usgs.events];
  const totalNew = bmkg.count + usgs.count;

  if (newEvents.length > 0) {
    logger.info({ bmkg: bmkg.count, usgs: usgs.count }, 'New earthquakes detected');
    await notifyEarthquake(newEvents);
  }

  return { bmkg: bmkg.count, usgs: usgs.count, totalNew };
}

/**
 * Delete earthquake events older than 90 days. Runs directly against Prisma —
 * the previous implementation HTTP-called localhost:4000, which could never
 * work on Workers.
 */
export async function cleanupOldEvents(): Promise<number> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const result = await supabaseDelete(
    'earthquake_events',
    `time=lt.${cutoff.toISOString()}`
  );

  logger.info({ deleted: result.count }, 'Old events cleaned up');
  return result.count;
}
