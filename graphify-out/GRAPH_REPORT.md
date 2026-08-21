# Graph Report - .  (2026-08-21)

## Corpus Check
- Corpus is ~21,980 words - fits in a single context window. You may not need a graph.

## Summary
- 543 nodes · 758 edges · 34 communities (28 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Frontend React App & Pages
- Backend Package Config & DevDeps
- Frontend Dependencies & Runtime Deps
- Frontend Dev Dependencies & Build Tools
- Backend TypeScript Config
- Backend Runtime Dependencies
- Root Workspace Package Config
- Frontend TypeScript Config
- Shared Types & Constants (Domain Models)
- Shared TypeScript Config
- Backend Alert & Notification Services
- README: Project Overview & APIs
- Backend Middleware & Route Handlers
- PWA Manifest Configuration
- Backend Earthquake Polling & Providers
- Backend App Entry & Middleware
- Shared Package Config
- Backend Fault, Soil & Risk Services
- Backend Risk Calculator Core
- Docker Compose & Database Infrastructure
- README: Data Sources & Alert Stack
- Frontend Map Integration & Branding
- README: Risk Assessment & Fault Models
- Backend Socket.io Service
- Backend Prisma Seed (JS)
- Backend Prisma Seed (TS)
- Frontend Apple PWA Meta Tags
- Frontend Inter Font & Tailwind
- Frontend Root Mount & Entry Point
- Frontend PWA Manifest Link

## God Nodes (most connected - your core abstractions)
1. `GeoAware Project` - 46 edges
2. `compilerOptions` - 20 edges
3. `compilerOptions` - 17 edges
4. `compilerOptions` - 16 edges
5. `useUserStore` - 15 edges
6. `cn()` - 15 edges
7. `scripts` - 13 edges
8. `RiskPage()` - 12 edges
9. `scripts` - 11 edges
10. `useQuery()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Concentric Circles (Epicenter)` --represents--> `EarthquakeEvent Model`  [INFERRED]
  frontend/public/favicon.svg → README.md
- `Triangle Icon (Mountain/Hazard)` --represents--> `FaultLine Model`  [INFERRED]
  frontend/public/favicon.svg → README.md
- `Blue Background (#0ea5e9)` --matches_brand_color--> `MAPBOX_TOKEN`  [INFERRED]
  frontend/public/favicon.svg → README.md
- `Inter Font (Google Fonts)` --styled_by--> `Tailwind CSS`  [INFERRED]
  frontend/index.html → README.md
- `Redis Service (redis:7-alpine)` --supports--> `Node.js`  [INFERRED]
  docker-compose.yml → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Feature Set** — readme_interactive_map, readme_risk_assessment, readme_hybrid_alert, readme_offline_safety [EXTRACTED 1.00]
- **Frontend Technology Stack** — readme_react18, readme_typescript, readme_vite, readme_mapbox_gl_js, readme_tailwind_css, readme_zustand, readme_workbox, readme_pwa [EXTRACTED 1.00]
- **Backend Technology Stack** — readme_nodejs, readme_express, readme_prisma, readme_postgresql, readme_postgis, readme_socketio, readme_node_cron, readme_zod [EXTRACTED 1.00]

## Communities (34 total, 6 thin omitted)

### Community 0 - "Frontend React App & Pages"
Cohesion: 0.10
Nodes (44): App(), PrivateRoute(), Layout(), navItems, MapContainer(), MapContainerProps, QueryContext, QueryContextType (+36 more)

### Community 1 - "Backend Package Config & DevDeps"
Cohesion: 0.05
Nodes (40): devDependencies, eslint, prisma, tsx, @types/cors, @types/express, @types/morgan, @types/node (+32 more)

### Community 2 - "Frontend Dependencies & Runtime Deps"
Cohesion: 0.05
Nodes (37): clsx, date-fns, dependencies, axios, clsx, date-fns, idb, lucide-react (+29 more)

### Community 3 - "Frontend Dev Dependencies & Build Tools"
Cohesion: 0.06
Nodes (31): autoprefixer, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, autoprefixer, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+23 more)

### Community 4 - "Backend TypeScript Config"
Cohesion: 0.07
Nodes (29): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules (+21 more)

### Community 5 - "Backend Runtime Dependencies"
Cohesion: 0.07
Nodes (29): dependencies, axios, cors, dotenv, express, fast-xml-parser, firebase-admin, helmet (+21 more)

### Community 6 - "Root Workspace Package Config"
Cohesion: 0.07
Nodes (28): concurrently, description, devDependencies, concurrently, typescript, engines, node, shared (+20 more)

### Community 7 - "Frontend TypeScript Config"
Cohesion: 0.07
Nodes (28): compilerOptions, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+20 more)

### Community 8 - "Shared Types & Constants (Domain Models)"
Cohesion: 0.08
Nodes (21): APP_CONFIG, FAULT_TYPE_COLORS, RISK_COLORS, RISK_LABELS, SOIL_LIQUEFACTION_RISK, AlertSettings, AppSettings, AssemblyPoint (+13 more)

### Community 9 - "Shared TypeScript Config"
Cohesion: 0.08
Nodes (23): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module (+15 more)

### Community 10 - "Backend Alert & Notification Services"
Cohesion: 0.14
Nodes (17): env, alertRoutes, contactSchema, safeStatusSchema, settingsSchema, generateJWT(), getFirebaseAccessToken(), logger (+9 more)

### Community 11 - "README: Project Overview & APIs"
Cohesion: 0.11
Nodes (23): Alerts & Contacts API, AssemblyPoint Model, DATABASE_URL, Earthquakes API, EvacuationRoute Model, Express, Fault Lines API, GeoAware Project (+15 more)

### Community 12 - "Backend Middleware & Route Handlers"
Cohesion: 0.14
Nodes (13): AppError, errorHandler(), logger, earthquakeRoutes, querySchema, faultRoutes, querySchema, routes (+5 more)

### Community 13 - "PWA Manifest Configuration"
Cohesion: 0.10
Nodes (19): background_color, categories, description, display, icons, lang, name, orientation (+11 more)

### Community 14 - "Backend Earthquake Polling & Providers"
Cohesion: 0.24
Nodes (12): cleanupOldEvents(), logger, startEarthquakePolling(), BMKGEvent, fetchBMKGEvents(), fetchUSGSEvents(), logger, parseBMKGCoordinates() (+4 more)

### Community 15 - "Backend App Entry & Middleware"
Cohesion: 0.18
Nodes (9): app, httpServer, io, logger, start(), rateLimiter(), requests, logger (+1 more)

### Community 16 - "Shared Package Config"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, typescript, main, name, private, scripts, build (+4 more)

### Community 17 - "Backend Fault, Soil & Risk Services"
Cohesion: 0.25
Nodes (4): assessSchema, getNearestFault(), getSoilTypeAtLocation(), globalForPrisma

### Community 18 - "Backend Risk Calculator Core"
Cohesion: 0.33
Nodes (10): calculateActivityScore(), calculateDistance(), calculateDistanceScore(), calculateMagnitudeScore(), calculateRisk(), calculateSoilScore(), determineRiskLevel(), generateBuildingChecklist() (+2 more)

### Community 19 - "Docker Compose & Database Infrastructure"
Cohesion: 0.24
Nodes (10): Service Healthchecks, Prisma init.sql Mount, PostgreSQL Service (postgis/postgis:16-3.4), postgres_data Volume, Redis Service (redis:7-alpine), redis_data Volume, Node.js, PostGIS (+2 more)

### Community 20 - "README: Data Sources & Alert Stack"
Cohesion: 0.25
Nodes (9): BMKG API, EarthquakeEvent Model, Firebase Config, Hybrid Alert System, Node-cron, Socket.io, Twilio Config, USGS API (+1 more)

### Community 21 - "Frontend Map Integration & Branding"
Cohesion: 0.25
Nodes (8): Mapbox Preconnect Links, Theme Color (#0ea5e9), Blue Background (#0ea5e9), Concentric Circles (Epicenter), GeoAware Favicon SVG, Interactive Risk & Fault Map, Mapbox GL JS, MAPBOX_TOKEN

### Community 22 - "README: Risk Assessment & Fault Models"
Cohesion: 0.33
Nodes (6): Triangle Icon (Mountain/Hazard), Badan Geologi / PuSGen, FaultLine Model, Personal Risk Assessment, RiskAssessment Model, SoilType Model

### Community 23 - "Backend Socket.io Service"
Cohesion: 0.60
Nodes (4): AuthenticatedSocket, logger, setupSocketHandlers(), validateToken()

## Knowledge Gaps
- **277 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+272 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GeoAware Project` connect `README: Project Overview & APIs` to `Docker Compose & Database Infrastructure`, `README: Data Sources & Alert Stack`, `Frontend Map Integration & Branding`, `README: Risk Assessment & Fault Models`, `Frontend Apple PWA Meta Tags`, `Frontend Inter Font & Tailwind`, `Frontend PWA Manifest Link`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Frontend Dev Dependencies & Build Tools` to `Frontend Dependencies & Runtime Deps`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Backend Runtime Dependencies` to `Backend Package Config & DevDeps`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _277 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend React App & Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.09941829719725014 - nodes in this community are weakly interconnected._
- **Should `Backend Package Config & DevDeps` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependencies & Runtime Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._