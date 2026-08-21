import { PrismaClient } from '@prisma/client';
import { Geometry } from 'wkx';

type FaultType = 'ACTIVE' | 'MEGATHRUST' | 'INACTIVE';
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type EventSource = 'BMKG' | 'USGS' | 'CITIZEN';

const prisma = new PrismaClient();

function geojsonToWkb(geojson: { type: string; coordinates: any }): Buffer {
  const geom = Geometry.parseGeoJSON(geojson);
  return geom.toWkb();
}

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.earthquakeEvent.deleteMany();
  await prisma.faultLine.deleteMany();
  await prisma.soilType.deleteMany();
  await prisma.assemblyPoint.deleteMany();
  await prisma.evacuationRoute.deleteMany();

  // Seed Fault Lines (Indonesia major faults)
  const faults = [
    {
      name: 'Sesar Semangko (Sumatera)',
      type: 'ACTIVE',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [95.5, -5.5], [96.5, -4.5], [97.5, -3.5], [98.5, -2.5], [99.5, -1.5], [100.5, -0.5], [101.5, 0.5]
      ]}),
      maxMagnitude: 7.5,
      activityLevel: 85,
      slipRate: 15.0,
      lastEvent: new Date('2004-12-26'),
      source: 'Badan Geologi',
    },
    {
      name: 'Sesar Palu-Koro (Sulawesi)',
      type: 'ACTIVE',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [119.5, -1.5], [120.0, -1.0], [120.5, -0.5], [121.0, 0.0], [121.5, 0.5]
      ]}),
      maxMagnitude: 7.8,
      activityLevel: 90,
      slipRate: 30.0,
      lastEvent: new Date('2018-09-28'),
      source: 'Badan Geologi',
    },
    {
      name: 'Sesar Cimandiri (Jawa Barat)',
      type: 'ACTIVE',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [106.5, -7.0], [106.8, -6.8], [107.0, -6.5], [107.2, -6.2], [107.5, -6.0]
      ]}),
      maxMagnitude: 6.5,
      activityLevel: 60,
      slipRate: 3.0,
      lastEvent: new Date('2000-06-04'),
      source: 'Badan Geologi',
    },
    {
      name: 'Sesar Lembang (Bandung)',
      type: 'ACTIVE',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [107.5, -6.9], [107.6, -6.85], [107.7, -6.8], [107.8, -6.75]
      ]}),
      maxMagnitude: 6.0,
      activityLevel: 50,
      slipRate: 2.5,
      source: 'Badan Geologi',
    },
    {
      name: 'Megathrust Sunda (Zona Subduksi)',
      type: 'MEGATHRUST',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [92.0, -8.0], [95.0, -6.0], [98.0, -4.0], [101.0, -2.0], [104.0, 0.0], [107.0, 2.0], [110.0, 4.0], [113.0, 6.0], [116.0, 8.0], [119.0, 10.0]
      ]}),
      maxMagnitude: 9.2,
      activityLevel: 95,
      slipRate: 60.0,
      lastEvent: new Date('2004-12-26'),
      source: 'Badan Geologi / PuSGen',
    },
    {
      name: 'Megathrust Jawa (Zona Subduksi Selatan Jawa)',
      type: 'MEGATHRUST',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [105.0, -8.5], [107.0, -7.8], [109.0, -7.2], [111.0, -6.8], [113.0, -6.5], [115.0, -6.3], [117.0, -6.2]
      ]}),
      maxMagnitude: 8.8,
      activityLevel: 88,
      slipRate: 55.0,
      lastEvent: new Date('2006-07-17'),
      source: 'Badan Geologi / PuSGen',
    },
    {
      name: 'Sesar Sorong (Papua)',
      type: 'ACTIVE',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [130.0, -2.0], [131.0, -1.5], [132.0, -1.0], [133.0, -0.5], [134.0, 0.0], [135.0, 0.5], [136.0, 1.0]
      ]}),
      maxMagnitude: 7.2,
      activityLevel: 70,
      slipRate: 20.0,
      source: 'Badan Geologi',
    },
    {
      name: 'Sesar Tarera-Aiduna (Maluku)',
      type: 'ACTIVE',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [127.0, -4.0], [127.5, -3.5], [128.0, -3.0], [128.5, -2.5], [129.0, -2.0]
      ]}),
      maxMagnitude: 7.0,
      activityLevel: 65,
      slipRate: 18.0,
      source: 'Badan Geologi',
    },
  ];

  for (const fault of faults) {
    await prisma.faultLine.create({ data: fault });
  }
  console.log(`Created ${faults.length} fault lines`);

  // Seed Soil Types
  const soilTypes = [
    {
      name: 'Tanah Lempung Lunak (Rawa)',
      code: 'CL_SOFT',
      liquefactionRisk: 'CRITICAL',
      description: 'Tanah lempung sangat lunak dengan kandungan air tinggi, sangat rawan likuifaksi saat gempa.',
      vs30: 100,
      geometry: geojsonToWkb({ type: 'Polygon', coordinates: [[
        [106.7, -6.3], [106.9, -6.3], [106.9, -6.1], [106.7, -6.1], [106.7, -6.3]
      ]]}),
      source: 'Badan Geologi',
    },
    {
      name: 'Pasir Lembut Rawa',
      code: 'SAND_LOOSE_SWAMP',
      liquefactionRisk: 'HIGH',
      description: 'Pasir halus lembut di area rawa/rawan banjir, berpotensi likuifaksi saat gempa kuat.',
      vs30: 180,
      geometry: geojsonToWkb({ type: 'Polygon', coordinates: [[
        [106.8, -6.5], [107.0, -6.5], [107.0, -6.3], [106.8, -6.3], [106.8, -6.5]
      ]]}),
      source: 'Badan Geologi',
    },
    {
      name: 'Tanah Lempung Keras',
      code: 'CL_STIFF',
      liquefactionRisk: 'LOW',
      description: 'Lempung keras dengan konsistensi baik, risiko likuifaksi rendah.',
      vs30: 350,
      geometry: geojsonToWkb({ type: 'Polygon', coordinates: [[
        [107.5, -6.9], [107.7, -6.9], [107.7, -6.7], [107.5, -6.7], [107.5, -6.9]
      ]]}),
      source: 'Badan Geologi',
    },
    {
      name: 'Batu Batuan Vulkanik',
      code: 'VOLCANIC_ROCK',
      liquefactionRisk: 'LOW',
      description: 'Batuan vulkanik kompak (andesit, basalt), sangat stabil saat gempa.',
      vs30: 800,
      geometry: geojsonToWkb({ type: 'Polygon', coordinates: [[
        [107.0, -7.2], [107.3, -7.2], [107.3, -7.0], [107.0, -7.0], [107.0, -7.2]
      ]]}),
      source: 'Badan Geologi',
    },
    {
      name: 'Pasir Padat (Pantai)',
      code: 'SAND_DENSE_COASTAL',
      liquefactionRisk: 'MEDIUM',
      description: 'Pasir padat di area pesisir, risiko likuifaksi menengah tergantung kadar air.',
      vs30: 250,
      geometry: geojsonToWkb({ type: 'Polygon', coordinates: [[
        [110.3, -7.8], [110.5, -7.8], [110.5, -7.6], [110.3, -7.6], [110.3, -7.8]
      ]]}),
      source: 'Badan Geologi',
    },
    {
      name: 'Tanah Organik (Gambut)',
      code: 'PEAT',
      liquefactionRisk: 'HIGH',
      description: 'Tanah gambut/organik dalam, tidak stabil, rawan subsiden dan likuifaksi.',
      vs30: 80,
      geometry: geojsonToWkb({ type: 'Polygon', coordinates: [[
        [102.0, -1.5], [102.3, -1.5], [102.3, -1.2], [102.0, -1.2], [102.0, -1.5]
      ]]}),
      source: 'Badan Geologi',
    },
    {
      name: 'Tanah Lempung Sedang',
      code: 'CL_MEDIUM',
      liquefactionRisk: 'MEDIUM',
      description: 'Lempung dengan konsistensi sedang, risiko likuifaksi menengah pada gempa besar.',
      vs30: 220,
      geometry: geojsonToWkb({ type: 'Polygon', coordinates: [[
        [106.0, -6.5], [106.3, -6.5], [106.3, -6.2], [106.0, -6.2], [106.0, -6.5]
      ]]}),
      source: 'Badan Geologi',
    },
    {
      name: 'Batu Sedimen Tebal',
      code: 'THICK_SEDIMENT',
      liquefactionRisk: 'MEDIUM',
      description: 'Endapan sedimen tebal (ratusan meter), dapat memperkuat guncangan gempa (site effect).',
      vs30: 200,
      geometry: geojsonToWkb({ type: 'Polygon', coordinates: [[
        [106.5, -6.0], [107.0, -6.0], [107.0, -5.5], [106.5, -5.5], [106.5, -6.0]
      ]]}),
      source: 'Badan Geologi',
    },
  ];

  for (const soil of soilTypes) {
    await prisma.soilType.create({ data: soil });
  }
  console.log(`Created ${soilTypes.length} soil types`);

  // Seed Assembly Points
  const assemblyPoints = [
    {
      name: 'Lapangan Merdeka Jakarta',
      location: geojsonToWkb({ type: 'Point', coordinates: [106.8272, -6.1754] }),
      address: 'Jl. Medan Merdeka Utara, Gambir, Jakarta Pusat',
      capacity: 50000,
      facilities: ['Toilet', 'Air Minum', 'Pos Kesehatan', 'Parkir Luas', 'Akses Transportasi Umum'],
      region: 'Jakarta',
    },
    {
      name: 'Gelora Bung Karno',
      location: geojsonToWkb({ type: 'Point', coordinates: [106.8017, -6.2183] }),
      address: 'Jl. Pintu Satu Senayan, Gelora, Tanah Abang, Jakarta Pusat',
      capacity: 80000,
      facilities: ['Toilet', 'Air Minum', 'Rumah Sakit dekat', 'Helipad', 'Akses Tol'],
      region: 'Jakarta',
    },
    {
      name: 'Lapangan Bandung (Alun-Alun)',
      location: geojsonToWkb({ type: 'Point', coordinates: [107.6098, -6.9175] }),
      address: 'Jl. Asia Afrika, Braga, Sumur Bandung, Bandung',
      capacity: 15000,
      facilities: ['Toilet', 'Air Minum', 'Puskesmas dekat', 'Terminal Bus'],
      region: 'Jawa Barat',
    },
    {
      name: 'Stadion Si Jalak Harupat',
      location: geojsonToWkb({ type: 'Point', coordinates: [107.5731, -6.9872] }),
      address: 'Jl. Ahmad Yani, Cibangkong, Bandung Kulon, Bandung',
      capacity: 27000,
      facilities: ['Toilet', 'Air Minum', 'Rumah Sakit dekat', 'Parkir Luas'],
      region: 'Jawa Barat',
    },
    {
      name: 'Alun-Alun Semarang',
      location: geojsonToWkb({ type: 'Point', coordinates: [110.4231, -6.9667] }),
      address: 'Jl. Pemuda, Kauman, Semarang Tengah, Semarang',
      capacity: 10000,
      facilities: ['Toilet', 'Air Minum', 'Rumah Sakit dekat', 'Terminal Terboyo'],
      region: 'Jawa Tengah',
    },
    {
      name: 'Stadion Mandala Krida',
      location: geojsonToWkb({ type: 'Point', coordinates: [110.4417, -7.0250] }),
      address: 'Jl. Imam Bonjol, Krapyak, Semarang',
      capacity: 25000,
      facilities: ['Toilet', 'Air Minum', 'Helipad', 'Parkir Luas'],
      region: 'Jawa Tengah',
    },
    {
      name: 'Lapangan Bali (Puputan Badung)',
      location: geojsonToWkb({ type: 'Point', coordinates: [115.2295, -8.6562] }),
      address: 'Jl. Surapati, Denpasar, Bali',
      capacity: 12000,
      facilities: ['Toilet', 'Air Minum', 'Rumah Sakit Sanglah dekat', 'Bandara Ngurah Rai'],
      region: 'Bali',
    },
    {
      name: 'Stadion Kapten I Wayan Dipta',
      location: geojsonToWkb({ type: 'Point', coordinates: [115.2833, -8.5500] }),
      address: 'Jl. Raya Kapten I Wayan Dipta, Gianyar, Bali',
      capacity: 25000,
      facilities: ['Toilet', 'Air Minum', 'Parkir Luas', 'Akses Tol'],
      region: 'Bali',
    },
    {
      name: 'Alun-Alun Surabaya',
      location: geojsonToWkb({ type: 'Point', coordinates: [112.7389, -7.2504] }),
      address: 'Jl. Tunjungan, Genteng, Surabaya',
      capacity: 10000,
      facilities: ['Toilet', 'Air Minum', 'Rumah Sakit Dr. Soetomo', 'Terminal Purabaya'],
      region: 'Jawa Timur',
    },
    {
      name: 'Stadion Gelora Bung Tomo',
      location: geojsonToWkb({ type: 'Point', coordinates: [112.7817, -7.3244] }),
      address: 'Jl. Ketintang, Gayungan, Surabaya',
      capacity: 55000,
      facilities: ['Toilet', 'Air Minum', 'Helipad', 'Parkir Luas', 'Akses Tol'],
      region: 'Jawa Timur',
    },
    {
      name: 'Lapangan Makassar (Losari Beach)',
      location: geojsonToWkb({ type: 'Point', coordinates: [119.4069, -5.1477] }),
      address: 'Jl. Penghibur, Ujung Pandang, Makassar',
      capacity: 20000,
      facilities: ['Toilet', 'Air Minum', 'Rumah Sakit dekat', 'Bandara Sultan Hasanuddin'],
      region: 'Sulawesi Selatan',
    },
    {
      name: 'Stadion Andi Mattalatta',
      location: geojsonToWkb({ type: 'Point', coordinates: [119.4450, -5.1833] }),
      address: 'Jl. Perintis Kemerdekaan, Makassar',
      capacity: 15000,
      facilities: ['Toilet', 'Air Minum', 'Parkir Luas'],
      region: 'Sulawesi Selatan',
    },
    {
      name: 'Alun-Alun Palu',
      location: geojsonToWkb({ type: 'Point', coordinates: [119.8700, -0.8917] }),
      address: 'Jl. Moh. Yamin, Palu Barat, Palu',
      capacity: 8000,
      facilities: ['Toilet', 'Air Minum', 'Rumah Sakit Undata', 'Bandara Mutiara'],
      region: 'Sulawesi Tengah',
    },
    {
      name: 'Stadion Tuah Pahoe',
      location: geojsonToWkb({ type: 'Point', coordinates: [113.9167, -2.2167] }),
      address: 'Jl. Pangeran Antasari, Palangka Raya',
      capacity: 10000,
      facilities: ['Toilet', 'Air Minum', 'Rumah Sakit dekat'],
      region: 'Kalimantan Tengah',
    },
    {
      name: 'Lapangan Ambon (Merah Putih)',
      location: geojsonToWkb({ type: 'Point', coordinates: [128.1806, -3.6931] }),
      address: 'Jl. Sudirman, Ambon',
      capacity: 8000,
      facilities: ['Toilet', 'Air Minum', 'Rumah Sakit Dr. Haulussy', 'Bandara Pattimura'],
      region: 'Maluku',
    },
    {
      name: 'Stadion Mandala',
      location: geojsonToWkb({ type: 'Point', coordinates: [140.7167, -2.5500] }),
      address: 'Jl. Raya Abepura, Jayapura',
      capacity: 30000,
      facilities: ['Toilet', 'Air Minum', 'Rumah Sakit Dok II', 'Bandara Sentani'],
      region: 'Papua',
    },
  ];

  for (const point of assemblyPoints) {
    await prisma.assemblyPoint.create({ data: point });
  }
  console.log(`Created ${assemblyPoints.length} assembly points`);

  // Seed Evacuation Routes
  const evacuationRoutes = [
    {
      name: 'Rute Evakuasi Jakarta Pusat - Lapangan Merdeka',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [106.8200, -6.1800], [106.8220, -6.1780], [106.8250, -6.1760], [106.8272, -6.1754]
      ]}),
      assemblyPoint: geojsonToWkb({ type: 'Point', coordinates: [106.8272, -6.1754] }),
      assemblyName: 'Lapangan Merdeka Jakarta',
      assemblyCapacity: 50000,
      distanceKm: 1.2,
      estimatedTimeMin: 15,
      region: 'Jakarta',
    },
    {
      name: 'Rute Evakuasi Jakarta Selatan - GBK',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [106.8000, -6.2300], [106.8005, -6.2250], [106.8010, -6.2200], [106.8017, -6.2183]
      ]}),
      assemblyPoint: geojsonToWkb({ type: 'Point', coordinates: [106.8017, -6.2183] }),
      assemblyName: 'Gelora Bung Karno',
      assemblyCapacity: 80000,
      distanceKm: 1.5,
      estimatedTimeMin: 18,
      region: 'Jakarta',
    },
    {
      name: 'Rute Evakuasi Bandung - Alun-Alun',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [107.6150, -6.9200], [107.6120, -6.9180], [107.6098, -6.9175]
      ]}),
      assemblyPoint: geojsonToWkb({ type: 'Point', coordinates: [107.6098, -6.9175] }),
      assemblyName: 'Lapangan Bandung (Alun-Alun)',
      assemblyCapacity: 15000,
      distanceKm: 0.8,
      estimatedTimeMin: 10,
      region: 'Jawa Barat',
    },
    {
      name: 'Rute Evakuasi Semarang - Alun-Alun',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [110.4200, -6.9700], [110.4215, -6.9680], [110.4231, -6.9667]
      ]}),
      assemblyPoint: geojsonToWkb({ type: 'Point', coordinates: [110.4231, -6.9667] }),
      assemblyName: 'Alun-Alun Semarang',
      assemblyCapacity: 10000,
      distanceKm: 0.5,
      estimatedTimeMin: 7,
      region: 'Jawa Tengah',
    },
    {
      name: 'Rute Evakuasi Surabaya - Alun-Alun',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [112.7350, -7.2550], [112.7370, -7.2520], [112.7389, -7.2504]
      ]}),
      assemblyPoint: geojsonToWkb({ type: 'Point', coordinates: [112.7389, -7.2504] }),
      assemblyName: 'Alun-Alun Surabaya',
      assemblyCapacity: 10000,
      distanceKm: 0.6,
      estimatedTimeMin: 8,
      region: 'Jawa Timur',
    },
    {
      name: 'Rute Evacuasi Bali - Puputan Badung',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [115.2300, -8.6600], [115.2295, -8.6562]
      ]}),
      assemblyPoint: geojsonToWkb({ type: 'Point', coordinates: [115.2295, -8.6562] }),
      assemblyName: 'Lapangan Bali (Puputan Badung)',
      assemblyCapacity: 12000,
      distanceKm: 0.4,
      estimatedTimeMin: 5,
      region: 'Bali',
    },
    {
      name: 'Rute Evacuasi Makassar - Losari Beach',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [119.4100, -5.1500], [119.4080, -5.1485], [119.4069, -5.1477]
      ]}),
      assemblyPoint: geojsonToWkb({ type: 'Point', coordinates: [119.4069, -5.1477] }),
      assemblyName: 'Lapangan Makassar (Losari Beach)',
      assemblyCapacity: 20000,
      distanceKm: 0.5,
      estimatedTimeMin: 6,
      region: 'Sulawesi Selatan',
    },
    {
      name: 'Rute Evacuasi Palu - Alun-Alun',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [119.8750, -0.8950], [119.8720, -0.8930], [119.8700, -0.8917]
      ]}),
      assemblyPoint: geojsonToWkb({ type: 'Point', coordinates: [119.8700, -0.8917] }),
      assemblyName: 'Alun-Alun Palu',
      assemblyCapacity: 8000,
      distanceKm: 0.7,
      estimatedTimeMin: 9,
      region: 'Sulawesi Tengah',
    },
    {
      name: 'Rute Evacuasi Jayapura - Stadion Mandala',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [140.7200, -2.5550], [140.7180, -2.5520], [140.7167, -2.5500]
      ]}),
      assemblyPoint: geojsonToWkb({ type: 'Point', coordinates: [140.7167, -2.5500] }),
      assemblyName: 'Stadion Mandala',
      assemblyCapacity: 30000,
      distanceKm: 0.6,
      estimatedTimeMin: 8,
      region: 'Papua',
    },
    {
      name: 'Rute Evacuasi Palangka Raya - Stadion Tuah Pahoe',
      geometry: geojsonToWkb({ type: 'LineString', coordinates: [
        [113.9200, -2.2200], [113.9180, -2.2180], [113.9167, -2.2167]
      ]}),
      assemblyPoint: geojsonToWkb({ type: 'Point', coordinates: [113.9167, -2.2167] }),
      assemblyName: 'Stadion Tuah Pahoe',
      assemblyCapacity: 10000,
      distanceKm: 0.5,
      estimatedTimeMin: 7,
      region: 'Kalimantan Tengah',
    },
  ];

  for (const route of evacuationRoutes) {
    await prisma.evacuationRoute.create({ data: route });
  }
  console.log(`Created ${evacuationRoutes.length} evacuation routes`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });