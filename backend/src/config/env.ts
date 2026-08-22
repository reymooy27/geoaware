export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/geoaware?schema=public',
  
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || '',
  
  BMKG_API_URL: process.env.BMKG_API_URL || 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.xml',
  USGS_API_URL: process.env.USGS_API_URL || 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || '',
  WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN || '',
} as const;