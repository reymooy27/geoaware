import { env } from '../config/env.js';
import { prisma } from '../utils/prisma.js';
import { Server } from 'socket.io';

const logger = {
  info: (obj: any, msg: string) => console.log(`[INFO] ${msg}`, obj),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (obj: any, msg: string) => console.error(`[ERROR] ${msg}`, obj),
};

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    logger.warn('Firebase not configured, skipping push notification');
    return false;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) return false;

    const message = {
      notification: { title, body },
      data: data || {},
      token: userId,
    };

    const accessToken = await getFirebaseAccessToken();
    
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error({ error }, 'FCM send failed');
      return false;
    }

    logger.info({ userId }, 'Push notification sent');
    return true;
  } catch (error) {
    logger.error({ error, userId }, 'Push notification error');
    return false;
  }
}

async function getFirebaseAccessToken(): Promise<string> {
  const jwt = await generateJWT();
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

async function generateJWT(): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    str2ab(env.FIREBASE_PRIVATE_KEY.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

function str2ab(str: string): ArrayBuffer {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function checkAndNotifyUsers(io: Server) {
  try {
    const recentEvents = await prisma.earthquakeEvent.findMany({
      where: {
        time: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        magnitude: { gte: 3.0 },
      },
      orderBy: { time: 'desc' },
    });

    if (recentEvents.length === 0) return;

    const users = await prisma.user.findMany({
      include: {
        settings: true,
      },
    });

    for (const user of users) {
      if (!user.settings?.pushEnabled) continue;

      const minMag = user.settings.minMagnitude || 3.0;
      const radiusKm = user.settings.alertRadiusKm || 100;

      const relevantEvents = recentEvents.filter((event: any) => 
        event.magnitude >= minMag
      );

      for (const event of relevantEvents) {
        if (user.settings.pushEnabled) {
          await sendPushNotification(
            user.id,
            `Gempa ${event.magnitude} SR`,
            `${event.place} - ${event.magnitude} SR, Kedalaman ${event.depth} km`,
            { eventId: event.id, magnitude: event.magnitude.toString() }
          );
        }

        io.to(`user:${user.id}`).emit('earthquake:alert', {
          id: event.id,
          magnitude: event.magnitude,
          place: event.place,
          time: event.time,
          coordinates: event.location,
        });
      }
    }
  } catch (error) {
    logger.error({ error }, 'Check and notify error');
  }
}

export async function broadcastEarthquakeAlert(io: Server, event: any) {
  io.emit('earthquake:new', event);
}