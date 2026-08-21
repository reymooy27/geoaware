import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { routes } from './routes/index.js';
import { setupSocketHandlers } from './services/socket.js';
import { startEarthquakePolling } from './services/earthquakePoller.js';
import { prisma } from './utils/prisma.js';

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (obj: any, msg: string) => console.error(`[ERROR] ${msg}`, obj),
};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(requestLogger);
app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(errorHandler);

setupSocketHandlers(io);

async function start() {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    if (env.NODE_ENV !== 'test') {
      startEarthquakePolling(io);
      logger.info('Earthquake polling started');
    }

    httpServer.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

const shutdown = async () => {
  logger.info('Shutting down...');
  await prisma.$disconnect();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();