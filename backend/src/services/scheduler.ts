import { supabaseDelete } from '../utils/prisma.js';
import { fetchBMKGEvents, fetchUSGSEvents } from './earthquakeProvider.js';
import { checkAndNotifyUsers } from './notification.js';

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
 * notifications to matching users. Invoked by the 5-minute Cron Trigger and
 * by POST /api/earthquakes/sync.
 */
export async function runEarthquakeSync(): Promise<SyncResult> {
  const [bmkgCount, usgsCount] = await Promise.all([
    fetchBMKGEvents(),
    fetchUSGSEvents(),
  ]);

  const totalNew = bmkgCount + usgsCount;

  if (totalNew > 0) {
    logger.info({ bmkgCount, usgsCount }, 'New earthquakes detected');
    await checkAndNotifyUsers();
  }

  return { bmkg: bmkgCount, usgs: usgsCount, totalNew };
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
