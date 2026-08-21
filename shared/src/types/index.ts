export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FaultLine {
  id: string;
  name: string;
  type: 'active' | 'megathrust' | 'inactive';
  geometry: GeoJSON.LineString;
  maxMagnitude: number;
  activityLevel: number;
  lastEvent?: string;
  slipRate?: number;
  distanceKm?: number;
}

export interface SoilType {
  id: string;
  name: string;
  code: string;
  liquefactionRisk: RiskLevel;
  description: string;
  vs30?: number;
  geometry?: GeoJSON.Polygon;
}

export interface RiskAssessment {
  location: Coordinates;
  address?: string;
  nearestFault: {
    fault: FaultLine;
    distanceKm: number;
  };
  soilType: SoilType;
  riskScore: RiskLevel;
  recommendations: string[];
  buildingChecklist: BuildingChecklistItem[];
}

export interface BuildingChecklistItem {
  id: string;
  category: 'foundation' | 'structure' | 'roof' | 'non-structural';
  question: string;
  description: string;
  isCompliant?: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface EarthquakeEvent {
  id: string;
  magnitude: number;
  depth: number;
  location: Coordinates;
  place: string;
  time: string;
  source: 'BMKG' | 'USGS' | 'CITIZEN';
  felt?: boolean;
  tsunami?: boolean;
}

export interface AlertSettings {
  enabled: boolean;
  minMagnitude: number;
  radiusKm: number;
  pushNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  emergencyContacts: EmergencyContact[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

export interface SafeStatus {
  userId: string;
  location: Coordinates;
  status: 'safe' | 'need_help' | 'injured';
  timestamp: string;
  message?: string;
}

export interface EvacuationRoute {
  id: string;
  name: string;
  geometry: GeoJSON.LineString;
  assemblyPoint: {
    name: string;
    location: Coordinates;
    capacity: number;
  };
  distanceKm: number;
  estimatedTimeMin: number;
}

export interface AssemblyPoint {
  id: string;
  name: string;
  location: Coordinates;
  address?: string;
  capacity: number;
  facilities: string[];
  region: string;
}

export interface OfflineMapRegion {
  id: string;
  name: string;
  bounds: BoundingBox;
  zoomLevels: [number, number];
  sizeMB: number;
  downloadedAt?: string;
  expiresAt?: string;
}

export interface UserLocation {
  coordinates: Coordinates;
  accuracy: number;
  timestamp: number;
  source: 'gps' | 'network' | 'manual';
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'id' | 'en';
  units: 'metric' | 'imperial';
  mapStyle: 'standard' | 'satellite' | 'hybrid';
  offlineMaps: OfflineMapRegion[];
  
  // Notification settings
  pushNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  minMagnitude: number;
  alertRadiusKm: number;
  
  // Offline settings
  offlineOnWifiOnly: boolean;
  shareLocationDefault: boolean;
}