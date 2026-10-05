import { AppError } from '../middleware/errorHandler.js';

/**
 * Cloudflare Workers bindings: plain-text vars from wrangler.jsonc `vars` and
 * secrets via `wrangler secret put`. All optional — fallbacks preserve the
 * previous local-dev defaults.
 */
export interface Bindings {
  NODE_ENV?: string;
  LOG_LEVEL?: string;

  DATABASE_URL?: string;
  DIRECT_URL?: string;

  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;

  CORS_ORIGIN?: string;

  MAPBOX_TOKEN?: string;

  BMKG_API_URL?: string;
  USGS_API_URL?: string;

  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;

  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;

  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;

  WHATSAPP_API_URL?: string;
  WHATSAPP_API_TOKEN?: string;

  HYPERDRIVE?: Hyperdrive;
}

export interface AppConfig {
  NODE_ENV: string;
  LOG_LEVEL: string;

  DATABASE_URL: string;
  DIRECT_URL: string;

  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  CORS_ORIGINS: string[];

  MAPBOX_TOKEN: string;

  BMKG_API_URL: string;
  USGS_API_URL: string;

  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;

  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;

  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;

  WHATSAPP_API_URL: string;
  WHATSAPP_API_TOKEN: string;
}

export type Env = {
  Bindings: Bindings;
};

let cached: AppConfig | undefined;
let cachedBindings: Bindings | undefined;

export function getBindings(): Bindings {
  return cachedBindings ?? {};
}

/** Call once per request (fetch) or per cron invocation (scheduled) before any service runs. */
export function initEnv(bindings: Bindings): AppConfig {
  cachedBindings = bindings;
  cached = {
    NODE_ENV: bindings.NODE_ENV ?? 'development',
    LOG_LEVEL: bindings.LOG_LEVEL ?? 'info',

    DATABASE_URL:
      bindings.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/geoaware?schema=public',
    DIRECT_URL: bindings.DIRECT_URL ?? bindings.DATABASE_URL ?? '',

    SUPABASE_URL: bindings.SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: bindings.SUPABASE_ANON_KEY ?? '',
    SUPABASE_SERVICE_ROLE_KEY: bindings.SUPABASE_SERVICE_ROLE_KEY ?? '',

    CORS_ORIGINS: (bindings.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),

    MAPBOX_TOKEN: bindings.MAPBOX_TOKEN ?? '',

    BMKG_API_URL:
      bindings.BMKG_API_URL ??
      'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.xml',
    USGS_API_URL:
      bindings.USGS_API_URL ??
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',

    FIREBASE_PROJECT_ID: bindings.FIREBASE_PROJECT_ID ?? '',
    FIREBASE_CLIENT_EMAIL: bindings.FIREBASE_CLIENT_EMAIL ?? '',
    FIREBASE_PRIVATE_KEY:
      bindings.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '',

    VAPID_PUBLIC_KEY: bindings.VAPID_PUBLIC_KEY ?? '',
    VAPID_PRIVATE_KEY: bindings.VAPID_PRIVATE_KEY ?? '',
    VAPID_SUBJECT: bindings.VAPID_SUBJECT ?? 'mailto:admin@geoaware.local',

    TWILIO_ACCOUNT_SID: bindings.TWILIO_ACCOUNT_SID ?? '',
    TWILIO_AUTH_TOKEN: bindings.TWILIO_AUTH_TOKEN ?? '',
    TWILIO_PHONE_NUMBER: bindings.TWILIO_PHONE_NUMBER ?? '',

    WHATSAPP_API_URL: bindings.WHATSAPP_API_URL ?? '',
    WHATSAPP_API_TOKEN: bindings.WHATSAPP_API_TOKEN ?? '',
  };
  return cached;
}

export function getEnv(): AppConfig {
  if (!cached) {
    throw new AppError(
      500,
      'Environment not initialized. initEnv() must run in the Worker entry point.',
      'ENV_NOT_INITIALIZED'
    );
  }
  return cached;
}
