-- Major Indonesian Fault Lines
-- Data source: BMKG, Badan Geologi

INSERT INTO fault_lines ("id", "name", "type", "geometry", "maxMagnitude", "activityLevel", "slipRate", "source", "metadata", "createdAt", "updatedAt") VALUES

-- Sunda Megathrust (subduction zone along southern Indonesia)
(gen_random_uuid()::text, 'Sunda Megathrust - Jawa', 'MEGATHRUST',
 ST_GeomFromText('LINESTRING(105.0 -10.5, 106.0 -9.8, 107.0 -9.2, 108.0 -8.7, 109.0 -8.3, 110.0 -8.0, 111.0 -7.8, 112.0 -7.7, 113.0 -8.0, 114.0 -8.5, 115.0 -8.8)', 4326),
 9.0, 10, 65.0, 'BMKG', '{"description": "Megathrust zone di selatan Jawa"}', NOW(), NOW()),

(gen_random_uuid()::text, 'Sunda Megathrust - Sumatera', 'MEGATHRUST',
 ST_GeomFromText('LINESTRING(95.0 5.5, 96.0 4.0, 97.0 2.5, 98.0 1.0, 99.0 -0.5, 100.0 -2.0, 101.0 -3.5, 102.0 -5.0, 103.0 -6.0, 104.0 -7.0, 105.0 -8.0, 105.5 -9.0)', 4326),
 9.2, 10, 50.0, 'BMKG', '{"description": "Megathrust zone di barat Sumatera"}', NOW(), NOW()),

-- Great Sumatran Fault
(gen_random_uuid()::text, 'Aceh Segment', 'ACTIVE',
 ST_GeomFromText('LINESTRING(95.3 5.5, 95.8 5.2, 96.3 4.8, 96.8 4.4, 97.0 4.1)', 4326),
 7.5, 8, 25.0, 'BMKG', '{"description": "Segmen Aceh dari Great Sumatran Fault"}', NOW(), NOW()),

(gen_random_uuid()::text, 'Toba Segment', 'ACTIVE',
 ST_GeomFromText('LINESTRING(98.5 2.6, 98.8 2.3, 99.1 2.0, 99.4 1.7, 99.7 1.4)', 4326),
 7.2, 7, 20.0, 'BMKG', '{"description": "Segmen Toba dari Great Sumatran Fault"}', NOW(), NOW()),

(gen_random_uuid()::text, 'Sumatera Utara Segment', 'ACTIVE',
 ST_GeomFromText('LINESTRING(99.7 1.4, 100.0 1.1, 100.3 0.8, 100.6 0.5, 100.9 0.2)', 4326),
 7.0, 7, 18.0, 'BMKG', '{"description": "Segmen Sumatera Utara"}', NOW(), NOW()),

(gen_random_uuid()::text, 'Sumatera Tengah Segment', 'ACTIVE',
 ST_GeomFromText('LINESTRING(100.9 0.2, 101.2 -0.1, 101.5 -0.4, 101.8 -0.7, 102.1 -1.0)', 4326),
 7.1, 7, 22.0, 'BMKG', '{"description": "Segmen Sumatera Tengah"}', NOW(), NOW()),

(gen_random_uuid()::text, 'Sumatera Barat Segment', 'ACTIVE',
 ST_GeomFromText('LINESTRING(102.1 -1.0, 102.4 -1.3, 102.7 -1.6, 103.0 -1.9, 103.3 -2.2)', 4326),
 7.3, 8, 23.0, 'BMKG', '{"description": "Segmen Sumatera Barat"}', NOW(), NOW()),

(gen_random_uuid()::text, 'Sumatera Selatan Segment', 'ACTIVE',
 ST_GeomFromText('LINESTRING(103.3 -2.2, 103.6 -2.5, 103.9 -2.8, 104.2 -3.1, 104.5 -3.4)', 4326),
 6.8, 6, 15.0, 'BMKG', '{"description": "Segmen Sumatera Selatan"}', NOW(), NOW()),

(gen_random_uuid()::text, 'Lampung Segment', 'ACTIVE',
 ST_GeomFromText('LINESTRING(104.5 -3.4, 104.8 -3.8, 105.1 -4.2, 105.4 -4.6, 105.7 -5.0)', 4326),
 7.0, 7, 20.0, 'BMKG', '{"description": "Segmen Lampung"}', NOW(), NOW()),

-- Palu-Koro Fault
(gen_random_uuid()::text, 'Palu-Koro Fault', 'ACTIVE',
 ST_GeomFromText('LINESTRING(119.8 -1.0, 120.0 -1.3, 120.2 -1.6, 120.4 -1.9, 120.6 -2.2, 120.8 -2.5)', 4326),
 7.5, 9, 35.0, 'BMKG', '{"description": "Palu-Koro Fault - Sumber gempa Palu 2018", "lastEvent": "2018-09-28"}', NOW(), NOW()),

-- Matano Fault
(gen_random_uuid()::text, 'Matano Fault', 'ACTIVE',
 ST_GeomFromText('LINESTRING(121.0 -2.5, 121.2 -2.7, 121.4 -2.9, 121.6 -3.1, 121.8 -3.3)', 4326),
 7.0, 7, 20.0, 'BMKG', '{"description": "Matano Fault di Sulawesi"}', NOW(), NOW()),

-- Flores Back Arc Thrust
(gen_random_uuid()::text, 'Flores Back Arc Thrust', 'ACTIVE',
 ST_GeomFromText('LINESTRING(118.0 -7.5, 119.0 -7.8, 120.0 -8.1, 121.0 -8.4, 122.0 -8.7, 123.0 -9.0)', 4326),
 7.5, 8, 25.0, 'BMKG', '{"description": "Flores Back Arc Thrust - sering gempa besar"}', NOW(), NOW()),

-- Wetar Thrust
(gen_random_uuid()::text, 'Wetar Thrust', 'ACTIVE',
 ST_GeomFromText('LINESTRING(124.0 -7.5, 125.0 -7.8, 126.0 -8.1, 127.0 -8.4)', 4326),
 7.5, 7, 20.0, 'BMKG', '{"description": "Wetar Thrust di NTT"}', NOW(), NOW()),

-- Banda Arc
(gen_random_uuid()::text, 'Banda Arc Thrust', 'ACTIVE',
 ST_GeomFromText('LINESTRING(126.0 -5.5, 127.0 -5.8, 128.0 -6.2, 129.0 -6.5, 130.0 -6.8)', 4326),
 7.8, 8, 30.0, 'BMKG', '{"description": "Banda Arc Thrust"}', NOW(), NOW()),

-- Java Faults
(gen_random_uuid()::text, 'Baribis Fault', 'ACTIVE',
 ST_GeomFromText('LINESTRING(106.8 -6.2, 107.0 -6.4, 107.2 -6.6, 107.4 -6.8, 107.6 -7.0, 107.8 -7.2)', 4326),
 7.0, 7, 5.0, 'BMKG', '{"description": "Baribis Fault - melewati Jakarta"}', NOW(), NOW()),

(gen_random_uuid()::text, 'Lembang Fault', 'ACTIVE',
 ST_GeomFromText('LINESTRING(107.6 -6.8, 107.7 -6.82, 107.8 -6.84, 107.9 -6.86)', 4326),
 6.5, 6, 3.0, 'BMKG', '{"description": "Lembang Fault di Bandung"}', NOW(), NOW()),

(gen_random_uuid()::text, 'Opak Fault', 'ACTIVE',
 ST_GeomFromText('LINESTRING(110.3 -7.7, 110.4 -7.8, 110.5 -7.9, 110.6 -8.0)', 4326),
 6.5, 6, 2.0, 'BMKG', '{"description": "Opak Fault di Bantul, DIY"}', NOW(), NOW()),

-- inactive faults
(gen_random_uuid()::text, 'Meratus Fault', 'INACTIVE',
 ST_GeomFromText('LINESTRING(115.5 -3.0, 115.8 -3.3, 116.1 -3.6, 116.4 -3.9)', 4326),
 5.0, 2, 0.5, 'BMKG', '{"description": "Meratus Fault di Kalimantan Selatan"}', NOW(), NOW()),

(gen_random_uuid()::text, 'Lupar Fault', 'INACTIVE',
 ST_GeomFromText('LINESTRING(109.5 -1.0, 110.0 -1.5, 110.5 -2.0, 111.0 -2.5)', 4326),
 5.5, 3, 1.0, 'BMKG', '{"description": "Lupar Fault di Kalimantan Barat"}', NOW(), NOW());
