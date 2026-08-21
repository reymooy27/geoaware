import { Server, Socket } from 'socket.io';
import { prisma } from '../utils/prisma.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupSocketHandlers(io: Server) {
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const user = await validateToken(token);
      if (!user) {
        return next(new Error('Invalid token'));
      }

      socket.userId = user.id;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info({ userId: socket.userId }, 'Client connected');

    socket.join(`user:${socket.userId}`);

    socket.on('location:update', async (data: { latitude: number; longitude: number }) => {
      try {
        await prisma.user.update({
          where: { id: socket.userId },
          data: {
            // Store last known location if needed
          },
        });

        socket.to(`user:${socket.userId}`).emit('location:updated', data);
      } catch (error) {
        logger.error({ error }, 'Location update error');
      }
    });

    socket.on('subscribe:earthquakes', (data: { minMagnitude?: number; radiusKm?: number }) => {
      socket.join('earthquakes:all');
      logger.debug({ userId: socket.userId, ...data }, 'Subscribed to earthquakes');
    });

    socket.on('unsubscribe:earthquakes', () => {
      socket.leave('earthquakes:all');
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId: socket.userId, reason }, 'Client disconnected');
    });
  });
}

async function validateToken(token: string): Promise<{ id: string } | null> {
  try {
    const user = await prisma.user.findFirst({
      where: { id: token },
      select: { id: true },
    });
    return user;
  } catch {
    return null;
  }
}

const logger = {
  info: (obj: any, msg: string) => console.log(`[INFO] ${msg}`, obj),
  debug: (obj: any, msg: string) => console.log(`[DEBUG] ${msg}`, obj),
  error: (obj: any, msg: string) => console.error(`[ERROR] ${msg}`, obj),
};