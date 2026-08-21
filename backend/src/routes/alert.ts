import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendPushNotification } from '../services/notification.js';
import { sendSMS } from '../services/sms.js';
import { sendWhatsApp } from '../services/whatsapp.js';

export const alertRoutes = Router();

const settingsSchema = z.object({
  enabled: z.boolean().default(true),
  minMagnitude: z.number().min(1).max(10).default(3.0),
  radiusKm: z.number().min(1).max(500).default(100),
  pushNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  whatsappNotifications: z.boolean().default(false),
});

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(20),
  relationship: z.string().max(50),
  isPrimary: z.boolean().default(false),
});

const safeStatusSchema = z.object({
  userId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: z.enum(['safe', 'need_help', 'injured']),
  message: z.string().max(500).optional(),
});

alertRoutes.get('/settings/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    const contacts = await prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { isPrimary: 'desc' },
    });

    res.json({
      ...settings,
      emergencyContacts: contacts,
    });
  } catch (error) {
    next(error);
  }
});

alertRoutes.put('/settings/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const data = settingsSchema.parse(req.body);

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

alertRoutes.post('/contacts/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const data = contactSchema.parse(req.body);

    if (data.isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.emergencyContact.create({
      data: { userId, ...data },
    });

    res.status(201).json(contact);
  } catch (error) {
    next(error);
  }
});

alertRoutes.put('/contacts/:contactId', async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const data = contactSchema.partial().parse(req.body);

    if (data.isPrimary) {
      const contact = await prisma.emergencyContact.findUnique({ where: { id: contactId } });
      if (contact) {
        await prisma.emergencyContact.updateMany({
          where: { userId: contact.userId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
    }

    const contact = await prisma.emergencyContact.update({
      where: { id: contactId },
      data,
    });

    res.json(contact);
  } catch (error) {
    next(error);
  }
});

alertRoutes.delete('/contacts/:contactId', async (req, res, next) => {
  try {
    const { contactId } = req.params;
    await prisma.emergencyContact.delete({ where: { id: contactId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

alertRoutes.post('/safe-status', async (req, res, next) => {
  try {
    const data = safeStatusSchema.parse(req.body);

    const status = await prisma.safeStatus.create({
      data: {
        userId: data.userId,
        location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
        status: data.status.toUpperCase() as any,
        message: data.message,
      },
    });

    // Notify emergency contacts
    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: data.userId },
    });

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    const userName = user?.name || 'Seseorang';

    const statusText = {
      safe: 'selamat',
      need_help: 'membutuhkan bantuan',
      injured: 'terluka',
    }[data.status];

    const message = `[GeoAware] ${userName} mengirim status: ${statusText.toUpperCase()}${data.message ? ` - ${data.message}` : ''}. Lokasi: https://maps.google.com/?q=${data.latitude},${data.longitude}`;

    for (const contact of contacts) {
      if (contact.phone) {
        await Promise.allSettled([
          sendSMS(contact.phone, message),
          sendWhatsApp(contact.phone, message),
        ]);
      }
    }

    res.status(201).json(status);
  } catch (error) {
    next(error);
  }
});

alertRoutes.get('/safe-status/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = '20' } = req.query;

    const statuses = await prisma.safeStatus.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(statuses);
  } catch (error) {
    next(error);
  }
});

alertRoutes.post('/test/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { type = 'push' } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

    const message = '[GeoAware] Ini adalah notifikasi tes peringatan gempa. Sistem Anda berfungsi dengan baik.';

    if (type === 'push') {
      await sendPushNotification(userId, 'Tes Peringatan Gempa', message);
    } else if (type === 'sms') {
      const contact = await prisma.emergencyContact.findFirst({ where: { userId, isPrimary: true } });
      if (contact) await sendSMS(contact.phone, message);
    } else if (type === 'whatsapp') {
      const contact = await prisma.emergencyContact.findFirst({ where: { userId, isPrimary: true } });
      if (contact) await sendWhatsApp(contact.phone, message);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});