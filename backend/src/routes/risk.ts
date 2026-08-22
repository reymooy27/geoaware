import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { calculateRisk } from '../services/riskCalculator.js';
import { getNearestFault } from '../services/faultService.js';
import { getSoilTypeAtLocation } from '../services/soilService.js';

export const riskRoutes = Router();

const assessSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  userId: z.string().optional(),
});

riskRoutes.post('/assess', async (req, res, next) => {
  try {
    const data = assessSchema.parse(req.body);
    const coordinates = { latitude: data.latitude, longitude: data.longitude };

    const [nearestFault, soilType] = await Promise.all([
      getNearestFault(coordinates),
      getSoilTypeAtLocation(coordinates),
    ]);

    if (!nearestFault) {
      throw new AppError(404, 'No fault lines found in database', 'NO_FAULT_DATA');
    }

    const assessment = await calculateRisk({
      coordinates,
      address: data.address,
      nearestFault,
      soilType: soilType || undefined,
    });

    if (data.userId) {
      const checklistJson = JSON.stringify(assessment.buildingChecklist).replace(/'/g, "''");
      const recsArr = assessment.recommendations;
      await prisma.$executeRawUnsafe(`
        INSERT INTO risk_assessments
          ("id", "userId", "location", "address", "nearestFaultId", "nearestFaultDist", "soilTypeId", "riskLevel", "recommendations", "buildingChecklist", "createdAt", "updatedAt")
        VALUES
          (gen_random_uuid()::text, $1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geometry, $4, $5, $6, $7, $8::"RiskLevel", $9, $10::jsonb, NOW(), NOW())
      `, data.userId, data.longitude, data.latitude, data.address || null, nearestFault.id, assessment.nearestFault.distanceKm, soilType?.id || null, assessment.riskScore.toUpperCase(), recsArr, checklistJson);
    }

    res.json(assessment);
  } catch (error) {
    next(error);
  }
});

riskRoutes.get('/history/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = '10', offset = '0' } = req.query;

    const assessments = await prisma.riskAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json(assessments);
  } catch (error) {
    next(error);
  }
});

riskRoutes.get('/building-checklist', async (_req, res, next) => {
  try {
    const checklist = [
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

    res.json(checklist);
  } catch (error) {
    next(error);
  }
});