import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const userRoutes = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
  language: z.enum(['ID', 'EN']).optional(),
  units: z.enum(['METRIC', 'IMPERIAL']).optional(),
  mapStyle: z.enum(['STANDARD', 'SATELLITE', 'HYBRID']).optional(),
});

userRoutes.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        theme: true,
        language: true,
        units: true,
        mapStyle: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

userRoutes.put('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        theme: true,
        language: true,
        units: true,
        mapStyle: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

userRoutes.delete('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    await prisma.user.delete({ where: { id: userId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});