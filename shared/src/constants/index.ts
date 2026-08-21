export const APP_CONFIG = {
  name: 'GeoAware',
  version: '1.0.0',
  description: 'Visualisasi Risiko & Peringatan Dini Gempa',
  
  // Map defaults
  map: {
    defaultCenter: { latitude: -2.5489, longitude: 118.0149 }, // Indonesia center
    defaultZoom: 5,
    minZoom: 3,
    maxZoom: 18,
    vectorTileUrl: 'https://tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.pbf?access_token={accessToken}',
    styleUrl: 'mapbox://styles/mapbox/light-v11',
  },

  // Risk thresholds
  risk: {
    distanceThresholds: {
      critical: 5,   // km
      high: 15,
      medium: 50,
    },
    magnitudeThresholds: {
      felt: 3.0,
      damaging: 5.0,
      major: 7.0,
    },
  },

  // Alert defaults
  alerts: {
    defaultMinMagnitude: 3.0,
    defaultRadiusKm: 100,
    checkIntervalMs: 60000, // 1 minute
    maxEventsStored: 1000,
  },

  // Offline
  offline: {
    maxRegions: 5,
    maxSizeMB: 500,
    expiryDays: 30,
    autoUpdateOnWifi: true,
  },

  // API endpoints
  api: {
    bmkg: 'https://data.bmkg.go.id/gempadirasakan.xml',
    usgs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
    pusgen: 'https://api.pusgen.bnpb.go.id',
    geologi: 'https://geologi.esdm.go.id/api',
    nominatim: 'https://nominatim.openstreetmap.org',
    overpass: 'https://overpass-api.de/api/interpreter',
  },

  // Cache
  cache: {
    earthquakeEvents: 300000, // 5 minutes
    faultLines: 86400000, // 24 hours
    soilData: 86400000, // 24 hours
    riskAssessment: 3600000, // 1 hour
  },
} as const;

export const RISK_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
} as const;

export const RISK_LABELS = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  critical: 'Sangat Tinggi',
} as const;

export const FAULT_TYPE_COLORS = {
  active: '#ef4444',
  megathrust: '#dc2626',
  inactive: '#9ca3af',
} as const;

export const SOIL_LIQUEFACTION_RISK = {
  very_low: 'low',
  low: 'low',
  moderate: 'medium',
  high: 'high',
  very_high: 'critical',
} as const;