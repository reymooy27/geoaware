import { query } from '../utils/prisma.js';
import { getEnv } from '../config/env.js';
import { notifySubscribers, type NewEvent } from './webpush.js';

const logger = {
  info: (obj: unknown, msg: string) => console.log(`[INFO] ${msg}`, obj),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (obj: unknown, msg: string) => console.error(`[ERROR] ${msg}`, obj),
};

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const env = getEnv();
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    logger.warn('Firebase not configured, skipping push notification');
    return false;
  }

  try {
    const users = await query(`users?select=id&id=eq.${userId}&limit=1`);
    if (users.length === 0) return false;

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
  const { FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = getEnv();
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
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
    str2ab(FIREBASE_PRIVATE_KEY.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '')),
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

/**
 * Deliver newly-ingested earthquake events to Web Push subscribers whose
 * magnitude threshold is met. Called by runEarthquakeSync with only the
 * events inserted in this cycle — duplicates are impossible at this layer.
 */
export async function notifyEarthquake(events: NewEvent[]): Promise<void> {
  try {
    await notifySubscribers(events);
  } catch (error) {
    logger.error({ error }, 'Notify subscribers error');
  }
}
