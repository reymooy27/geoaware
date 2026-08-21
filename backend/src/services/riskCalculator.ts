import type { FaultLine, SoilType, RiskLevel, Coordinates, BuildingChecklistItem } from '../../../shared/dist/types/index.js';

export interface RiskAssessmentResult {
  location: Coordinates;
  address?: string;
  nearestFault: {
    fault: FaultLine;
    distanceKm: number;
  };
  soilType: SoilType | null;
  riskScore: RiskLevel;
  recommendations: string[];
  buildingChecklist: BuildingChecklistItem[];
}

function calculateDistanceScore(distanceKm: number): number {
  if (distanceKm <= 5) return 100;
  if (distanceKm <= 15) return 70;
  if (distanceKm <= 50) return 40;
  if (distanceKm <= 100) return 20;
  return 10;
}

function calculateMagnitudeScore(maxMagnitude: number): number {
  if (maxMagnitude >= 8.0) return 100;
  if (maxMagnitude >= 7.0) return 80;
  if (maxMagnitude >= 6.0) return 60;
  if (maxMagnitude >= 5.0) return 40;
  return 20;
}

function calculateActivityScore(activityLevel: number): number {
  return Math.min(activityLevel * 10, 100);
}

function calculateSoilScore(liquefactionRisk: RiskLevel): number {
  switch (liquefactionRisk) {
    case 'critical': return 100;
    case 'high': return 75;
    case 'medium': return 50;
    case 'low': return 20;
    default: return 20;
  }
}

function determineRiskLevel(totalScore: number): RiskLevel {
  if (totalScore >= 75) return 'critical';
  if (totalScore >= 55) return 'high';
  if (totalScore >= 35) return 'medium';
  return 'low';
}

export function calculateRisk(params: {
  coordinates: Coordinates;
  address?: string;
  nearestFault: FaultLine;
  soilType?: SoilType;
}): RiskAssessmentResult {
  const { coordinates, address, nearestFault, soilType } = params;

  const distanceKm = calculateDistance(
    coordinates.latitude,
    coordinates.longitude,
    (nearestFault.geometry.coordinates[0] as [number, number])[1],
    (nearestFault.geometry.coordinates[0] as [number, number])[0]
  );

  const distanceScore = calculateDistanceScore(distanceKm);
  const magnitudeScore = calculateMagnitudeScore(nearestFault.maxMagnitude);
  const activityScore = calculateActivityScore(nearestFault.activityLevel);
  const soilScore = soilType ? calculateSoilScore(soilType.liquefactionRisk) : 10;

  const weights = {
    distance: 0.35,
    magnitude: 0.25,
    activity: 0.20,
    soil: 0.20,
  };

  const totalScore = 
    distanceScore * weights.distance +
    magnitudeScore * weights.magnitude +
    activityScore * weights.activity +
    soilScore * weights.soil;

  const riskScore = determineRiskLevel(totalScore);

  const recommendations = generateRecommendations(riskScore, distanceKm, soilType);
  const buildingChecklist = generateBuildingChecklist(riskScore);

  return {
    location: coordinates,
    address,
    nearestFault: { fault: nearestFault, distanceKm },
    soilType: soilType || null,
    riskScore,
    recommendations,
    buildingChecklist,
  };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 100) / 100;
}

function generateRecommendations(risk: RiskLevel, distanceKm: number, soilType?: SoilType): string[] {
  const base = [
    'Pastikan keluarga memiliki rencana darurat gempa yang disepakati bersama.',
    'Siapkan tas siaga (go-bag) berisi air, makanan, obat-obatan, dokumen penting, dan perlengkapan dasar.',
    'Identifikasi tempat aman di setiap ruangan (di bawah meja kuat, jauh dari kaca dan furnitur tinggi).',
    'Latih prosedur "Drop, Cover, Hold On" dengan seluruh anggota keluarga secara berkala.',
  ];

  if (risk === 'critical' || risk === 'high') {
    base.push(
      'Konsultasi dengan ahli struktur untuk evaluasi ketahanan bangunan rumah Anda.',
      'Pertimbangkan retrofit struktur jika bangunan tidak memenuhi standar gempa terbaru.',
      'Pasang sensor gempa otomatis yang dapat mematikan gas/listrik saat gempa besar.',
    );
  }

  if (distanceKm <= 10) {
    base.push(
      'Rumah Anda sangat dekat dengan patahan aktif. Prioritaskan penguatan struktur.',
      'Hindari tempat tidur dekat jendela atau dinding luar yang berbatasan dengan patahan.',
    );
  }

  if (soilType && (soilType.liquefactionRisk === 'high' || soilType.liquefactionRisk === 'critical')) {
    base.push(
      'Tanah di lokasi Anda berisiko tinggi likuifaksi. Fondasi harus dirancang khusus (tiang pancang/raft).',
      'Hindari pembangunan kolam renang atau genangan air besar di dekat bangunan.',
      'Pastikan sistem drainase berfungsi baik untuk mencegah kenaikan air tanah.',
    );
  }

  return base;
}

function generateBuildingChecklist(risk: RiskLevel): BuildingChecklistItem[] {
  const baseChecklist: BuildingChecklistItem[] = [
    {
      id: 'foundation-1',
      category: 'foundation',
      question: 'Apakah fondasi menggunakan beton bertulang (RC) dengan kedalaman minimal 1.5m?',
      description: 'Fondasi yang dalam dan kokoh mengurangi risiko geser tanah saat gempa.',
      priority: 'high',
    },
    {
      id: 'foundation-2',
      category: 'foundation',
      question: 'Apakah terdapat sloof (balok ikatan) di seluruh sudut bangunan?',
      description: 'Sloof mengikat struktur atas agar tidak mudah runtuh.',
      priority: 'high',
    },
    {
      id: 'structure-1',
      category: 'structure',
      question: 'Apakah kolom dan balok menggunakan tulangan minimum Ø12 dengan sengkang Ø8 spasi 15cm?',
      description: 'Tulangan yang memadai menahan gaya geser dan momen gempa.',
      priority: 'high',
    },
    {
      id: 'structure-2',
      category: 'structure',
      question: 'Apakah dinding bata dipasang kanstin (kolom praktis) setiap 3 meter?',
      description: 'Kanstin mencegah dinding bata robek saat gempa.',
      priority: 'high',
    },
    {
      id: 'roof-1',
      category: 'roof',
      question: 'Apakah atap menggunakan ring beam (balok ikatan atap) di seluruh perimeternya?',
      description: 'Ring beam mengikat struktur atap agar tidak terlepas saat gempa.',
      priority: 'medium',
    },
    {
      id: 'roof-2',
      category: 'roof',
      question: 'Apakah penutup atap menggunakan genteng beton/keramik yang diikat dengan kawat?',
      description: 'Genteng yang terikat tidak mudah terlepas dan menimpa penghuni.',
      priority: 'medium',
    },
    {
      id: 'non-structural-1',
      category: 'non-structural',
      question: 'Apakah furnitur tinggi (lemari, rak buku) sudah dibaut ke dinding?',
      description: 'Mencegah furnitur tertimbun saat gempa.',
      priority: 'medium',
    },
    {
      id: 'non-structural-2',
      category: 'non-structural',
      question: 'Apakah kaca jendela menggunakan film safety atau kaca tempered?',
      description: 'Mencegah pecahan kaca melukai penghuni.',
      priority: 'low',
    },
  ];

  if (risk === 'critical' || risk === 'high') {
    baseChecklist.push(
      {
        id: 'foundation-3',
        category: 'foundation',
        question: 'Apakah fondasi menggunakan tiang pancang (pile) untuk tanah lunak/likuifaksi?',
        description: 'Tiang pancang menyalurkan beban ke lapisan tanah keras di bawah.',
        priority: 'high',
      },
      {
        id: 'structure-3',
        category: 'structure',
        question: 'Apakah struktur menggunakan sistem shear wall atau moment resisting frame?',
        description: 'Sistem lateral yang kuat menahan gaya gempa arah horizontal.',
        priority: 'high',
      },
      {
        id: 'structure-4',
        category: 'structure',
        question: 'Apakah sambungan kolom-balak menggunakan plat dan baut (moment connection)?',
        description: 'Sambungan kaku mencegah keruntuhan progresif struktur.',
        priority: 'high',
      }
    );
  }

  return baseChecklist;
}