import cron from 'node-cron';
import { Server } from 'socket.io';
import { fetchBMKGEvents, fetchUSGSEvents } from './earthquakeProvider.js';
import { checkAndNotifyUsers } from './notification.js';

const logger = {
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
  info: (obj: any, msg: string) => console.log(`[INFO] ${msg}`, obj),
  error: (obj: any, msg: string) => console.error(`[ERROR] ${msg}`, obj),
};

export function startEarthquakePolling(io: Server) {
  cron.schedule('* * * * *', async () => {
    try {
      logger.debug('Polling for new earthquakes...');
      
      const [bmkgCount, usgsCount] = await Promise.all([
        fetchBMKGEvents(),
        fetchUSGSEvents(),
      ]);

      const totalNew = bmkgCount + usgsCount;
      
      if (totalNew > 0) {
        logger.info({ bmkgCount, usgsCount }, 'New earthquakes detected');
        
        await checkAndNotifyUsers(io);
        
        io.emit('earthquakes:updated', { 
          newCount: totalNew,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error({ error }, 'Earthquake polling error');
    }
  });

  cron.schedule('0 * * * *', async () => {
    try {
      await cleanupOldEvents();
    } catch (error) {
      logger.error({ error }, 'Cleanup error');
    }
  });

  logger.info({}, 'Earthquake polling scheduled');
}

async function cleanupOldEvents() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  try {
    const response = await fetch('http://localhost:4000/api/earthquakes/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ before: cutoff.toISOString() }),
    });

    if (response.ok) {
      const data = await response.json() as { deleted: number };
      logger.info({ deleted: data.deleted }, 'Old events cleaned up');
    }
  } catch (error) {
    logger.error({ error }, 'Cleanup fetch failed');
  }
}