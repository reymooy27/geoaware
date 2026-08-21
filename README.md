# GeoAware - Visualisasi Risiko & Peringatan Dini Gempa

Aplikasi web progresif (PWA) untuk visualisasi risiko gempa bumi, peringatan dini real-time, dan navigasi evakuasi offline di Indonesia.

## 🌟 Fitur Utama

### 🗺️ Peta Interaktif Risiko & Patahan
- Visualisasi jalur patahan aktif (warna merah) dan zona megathrust (warna merah tua)
- Mode micro-zoom hingga tingkat persil rumah dengan batas zona risiko
- Vector tiles rendering untuk performa cepat di smartphone entry-level
- Layer tambahan: risiko likuifaksi, titik kumpul evakuasi, rute evakuasi

### 🏠 Personal Risk Assessment ("Seberapa Aman Rumah Saya?")
- Cek risiko sekali klik via alamat atau GPS
- Jarak ke patahan aktif terdekat (km)
- Jenis tanah & risiko likuifaksi (Rendah/Sedang/Tinggi/Sangat Tinggi)
- Skor risiko gempa dengan rekomendasi struktural
- Checklist mandiri bangunan tahan gempa (fondasi, struktur, atap, non-struktural)

### 🔔 Hybrid Alert System (Peringatan Real-Time)
- Integrasi API BMKG & USGS untuk notifikasi gempa M≥3.0
- Fitur "Saya Selamat": kirim koordinat & status ke kontak darurat via SMS/WhatsApp
- Pengaturan threshold magnitudo & radius peringatan
- Test notifikasi (Push, SMS, WhatsApp)

### 📱 Offline Safety & Navigation Mode
- Unduh peta patahan & rute evakuasi per area (max 5 area, 500MB)
- Akses penuh tanpa koneksi internet
- Navigasi ke titik kumpul terdekat dengan estimasi waktu
- Auto-update peta saat WiFi tersedia

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Mapbox GL JS** untuk vector tile rendering
- **Tailwind CSS** untuk styling (Dark/Light mode)
- **Zustand** untuk state management
- **Service Worker** untuk offline support (Workbox)
- **PWA** dengan install prompt & shortcuts

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** dengan **PostgreSQL + PostGIS** untuk query spasial
- **Socket.io** untuk real-time updates
- **Node-cron** untuk polling earthquake data
- **Zod** untuk validasi

### Data Sources
- **BMKG** (data.bmkg.go.id) - Gempa dirasakan Indonesia
- **USGS** (earthquake.usgs.gov) - Global earthquake feed
- **Badan Geologi / PuSGen** - Data patahan & zona risiko
- **OpenStreetMap / Nominatim** - Geocoding & POI

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16 dengan PostGIS 3.4+
- Mapbox Access Token (gratis di mapbox.com)

### 1. Clone & Install
```bash
git clone <repo-url>
cd geoaware
npm install
```

### 2. Setup Database
```bash
# Start PostgreSQL dengan PostGIS (via Docker)
docker-compose up -d

# Copy environment
cp .env.example .env
# Edit .env dengan konfigurasi Anda

# Generate Prisma client & push schema
npm run db:generate
npm run db:push

# (Optional) Seed sample data
npm run db:seed
```

### 3. Configure Mapbox
```bash
# Edit .env dan tambahkan MAPBOX_TOKEN
MAPBOX_TOKEN=pk.your_mapbox_token_here
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

### 4. Run Development
```bash
# Jalankan frontend & backend bersamaan
npm run dev

# Atau terpisah:
npm run dev:frontend  # http://localhost:3000
npm run dev:backend   # http://localhost:4000
```

## 📁 Project Structure

```
geoaware/
├── frontend/                 # React + Vite + Mapbox GL
│   ├── src/
│   │   ├── components/       # UI Components (Map, Layout, etc)
│   │   ├── pages/            # Page components (Home, Risk, Alerts, etc)
│   │   ├── hooks/            # Custom hooks (stores, theme, query)
│   │   ├── utils/            # Helpers, formatters
│   │   └── styles/           # Global CSS (Tailwind)
│   ├── public/               # Static assets, SW, manifest
│   └── package.json
├── backend/                  # Node.js + Express + Prisma
│   ├── src/
│   │   ├── config/           # Environment config
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/       # Error handling, rate limit, logging
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic (risk, faults, earthquakes)
│   │   ├── utils/            # Prisma client, helpers
│   │   └── index.ts          # Entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema dengan PostGIS
│   │   └── seed.ts           # Sample data seeder
│   └── package.json
├── shared/                   # Shared types & constants
│   └── src/
│       ├── types/            # TypeScript interfaces
│       └── constants/        # App constants, risk thresholds
├── docker-compose.yml        # PostgreSQL + PostGIS + Redis
└── package.json              # Root workspace config
```

## 🗄️ Database Schema (PostGIS)

Model utama dengan dukungan spatial:
- **FaultLine** - Geometry LineString (SRID 4326), tipe: active/megathrust/inactive
- **SoilType** - Geometry Polygon, risiko likuifaksi, Vs30
- **RiskAssessment** - Geometry Point, relasi ke fault & soil
- **EarthquakeEvent** - Geometry Point, magnitude, depth, source
- **EvacuationRoute** - Geometry LineString + assembly point
- **AssemblyPoint** - Geometry Point, kapasitas, fasilitas
- **OfflineMapRegion** - Geometry Polygon untuk area download

## 🔌 API Endpoints

### Risk Assessment
```
POST   /api/risk/assess          # Analisis risiko lokasi
GET    /api/risk/history/:userId # Riwayat penilaian user
GET    /api/risk/building-checklist # Checklist bangunan
```

### Earthquakes
```
GET    /api/earthquakes          # List gempa (filter: magnitude, radius, source)
GET    /api/earthquakes/latest   # Gempa terbaru M≥3.0
GET    /api/earthquakes/stats    # Statistik gempa
POST   /api/earthquakes/sync     # Manual sync BMKG/USGS
```

### Alerts & Contacts
```
GET    /api/alerts/settings/:userId
PUT    /api/alerts/settings/:userId
POST   /api/alerts/contacts/:userId
PUT    /api/alerts/contacts/:contactId
DELETE /api/alerts/contacts/:contactId
POST   /api/alerts/safe-status   # Kirim status "Saya Selamat"
GET    /api/alerts/safe-status/:userId
POST   /api/alerts/test/:userId  # Test notifikasi
```

### Fault Lines
```
GET    /api/faults               # List patahan (filter: type, radius)
GET    /api/faults/:faultId      # Detail patahan
GET    /api/faults/nearby/:lat/:lng # Patahan terdekat
```

### Offline & Navigation
```
GET    /api/offline/regions/:userId
POST   /api/offline/regions/:userId
DELETE /api/offline/regions/:regionId
GET    /api/offline/evacuation-routes
GET    /api/offline/assembly-points
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Backend only
npm run test --workspace=backend

# Frontend only
npm run test --workspace=frontend
```

## 📦 Build Production

```bash
# Build all workspaces
npm run build

# Frontend build output di frontend/dist
# Backend build output di backend/dist
```

## 🐳 Docker Production

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Run
docker-compose -f docker-compose.prod.yml up -d
```

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string dengan PostGIS |
| `MAPBOX_TOKEN` | Yes | Mapbox access token untuk rendering peta |
| `FIREBASE_*` | No | Firebase config untuk push notification |
| `TWILIO_*` | No | Twilio config untuk SMS |
| `WHATSAPP_*` | No | WhatsApp Business API config |

## 📱 PWA Features

- **Installable** di Android/iOS
- **Offline-first** dengan Service Worker
- **Background sync** untuk data gempa
- **Push notifications** via Firebase
- **App shortcuts** untuk akses cepat ke fitur utama

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/nama-fitur`)
3. Commit changes (`git commit -m 'feat: tambah fitur X'`)
4. Push branch (`git push origin feature/nama-fitur`)
5. Open Pull Request

## 📄 License

MIT License - lihat [LICENSE](LICENSE) untuk detail.

## 🙏 Acknowledgments

- **BMKG** - Data gempa & patahan Indonesia
- **USGS** - Global earthquake data
- **Badan Geologi** - Data zona risiko & likuifaksi
- **OpenStreetMap** - Geocoding & base map data
- **Mapbox** - Vector tiles & rendering engine
- **PostGIS** - Spatial database extension

---

**GeoAware** - Menjembatani kesenjangan antara data geospasial kompleks dan kebutuhan masyarakat awam akan informasi risiko gempa yang mudah dipahami, real-time, dan accessible offline.