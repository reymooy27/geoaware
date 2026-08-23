import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import type { Env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { readJson } from '../utils/http.js';

export const userRoutes = new Hono<Env>();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
  language: z.enum(['ID', 'EN']).optional(),
  units: z.enum(['METRIC', 'IMPERIAL']).optional(),
  mapStyle: z.enum(['STANDARD', 'SATELLITE', 'HYBRID']).optional(),
});

const userSelect = {
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
} as const;

userRoutes.get('/:userId', async (c) => {
  const { userId } = c.req.param();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return c.json(user);
});

userRoutes.put('/:userId', async (c) => {
  const { userId } = c.req.param();
  const data = updateProfileSchema.parse(await readJson(c));

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: userSelect,
  });

  return c.json(user);
});

userRoutes.delete('/:userId', async (c) => {
  const { userId } = c.req.param();
  await prisma.user.delete({ where: { id: userId } });
  return c.body(null, 204);
});
