import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import type { Env } from '../config/env.js';
import { getEnv } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { readJson } from '../utils/http.js';
import { sendPushNotification } from '../services/notification.js';
import { saveSubscription, removeSubscription, notifySubscribers } from '../services/webpush.js';
import { sendSMS } from '../services/sms.js';
import { sendWhatsApp } from '../services/whatsapp.js';

export const alertRoutes = new Hono<Env>();

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

alertRoutes.get('/settings/:userId', async (c) => {
  const { userId } = c.req.param();

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  const contacts = await prisma.emergencyContact.findMany({
    where: { userId },
    orderBy: { isPrimary: 'desc' },
  });

  return c.json({
    ...settings,
    emergencyContacts: contacts,
  });
});

alertRoutes.put('/settings/:userId', async (c) => {
  const { userId } = c.req.param();
  const data = settingsSchema.parse(await readJson(c));

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  return c.json(settings);
});

alertRoutes.post('/contacts/:userId', async (c) => {
  const { userId } = c.req.param();
  const data = contactSchema.parse(await readJson(c));

  if (data.isPrimary) {
    await prisma.emergencyContact.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.emergencyContact.create({
    data: { userId, ...data },
  });

  return c.json(contact, 201);
});

alertRoutes.put('/contacts/:contactId', async (c) => {
  const { contactId } = c.req.param();
  const data = contactSchema.partial().parse(await readJson(c));

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

  return c.json(contact);
});

alertRoutes.delete('/contacts/:contactId', async (c) => {
  const { contactId } = c.req.param();
  await prisma.emergencyContact.delete({ where: { id: contactId } });
  return c.body(null, 204);
});

alertRoutes.post('/safe-status', async (c) => {
  const data = safeStatusSchema.parse(await readJson(c));

  const [status] = await prisma.$queryRawUnsafe<[{ id: string }]>(`
    INSERT INTO safe_statuses ("id", "userId", "location", "status", "message", "timestamp")
    VALUES (gen_random_uuid()::text, $1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geometry, $4::"SafeStatusType", $5, NOW())
    RETURNING id
  `, data.userId, data.longitude, data.latitude, data.status.toUpperCase(), data.message || null);

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

  return c.json(status, 201);
});

alertRoutes.get('/safe-status/:userId', async (c) => {
  const { userId } = c.req.param();
  const { limit = '20' } = c.req.query();

  const statuses = await prisma.safeStatus.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: parseInt(limit),
  });

  return c.json(statuses);
});

alertRoutes.post('/test/:userId', async (c) => {
  const { userId } = c.req.param();
  const body = (await readJson(c)) as { type?: string };
  const type = body.type ?? 'push';

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

  return c.json({ success: true });
});

const subscribeSchema = z.object({
  endpoint: z.string().max(2048).refine((e) => e.startsWith('https://'), {
    message: 'Push endpoint must be https',
  }),
  keys: z.object({
    p256dh: z.string().min(10).max(256),
    auth: z.string().min(5).max(64),
  }),
  minMagnitude: z.number().min(3).max(10).default(3.0),
});

alertRoutes.get('/push/public-key', (c) =>
  c.json({ key: getEnv().VAPID_PUBLIC_KEY || null })
);

alertRoutes.post('/push/subscribe', async (c) => {
  const data = subscribeSchema.parse(await readJson(c));
  await saveSubscription(data.endpoint, data.keys, data.minMagnitude);
  return c.json({ ok: true }, 201);
});

alertRoutes.post('/push/unsubscribe', async (c) => {
  const { endpoint } = z.object({ endpoint: z.string().min(10).max(2048) }).parse(await readJson(c));
  await removeSubscription(endpoint);
  return c.body(null, 204);
});

alertRoutes.post('/push/test', async (c) => {
  await notifySubscribers([
    {
      id: `test-${Date.now()}`,
      magnitude: 5.5,
      depth: 10,
      place: '(pesan uji coba notifikasi)',
      time: new Date().toISOString(),
      source: 'TEST',
    },
  ]);
  return c.json({ ok: true });
});
