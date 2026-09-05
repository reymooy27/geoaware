import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger as honoLogger } from 'hono/logger';

import type { Env, Bindings } from './config/env.js';
import { getEnv, initEnv } from './config/env.js';
import { onError, notFound } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { api } from './routes/index.js';
import { runEarthquakeSync, cleanupOldEvents } from './services/scheduler.js';
import { resetPrismaClient } from './utils/prisma.js';

const app = new Hono<Env>();

app.use('*', async (c, next) => {
  initEnv(c.env);
  await next();
});

app.use('*', secureHeaders());
app.use('*', async (c, next) => {
  const { CORS_ORIGINS, NODE_ENV } = getEnv();
  return cors({
    origin: (origin) =>
      !origin || CORS_ORIGINS.includes(origin) || NODE_ENV !== 'production'
        ? origin
        : CORS_ORIGINS[0],
    credentials: true,
  })(c, next);
});
app.use('*', honoLogger());
app.use('/api/*', rateLimiter);

app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.route('/api', api);

app.notFound(notFound);
app.onError(onError);

export default {
  fetch: app.fetch,
  scheduled(controller: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    initEnv(env);

    if (controller.cron === '0 * * * *') {
      ctx.waitUntil(
        cleanupOldEvents().catch((error) =>
          console.error('[ERROR] Cleanup error', error)
        )
      );
      return;
    }

    ctx.waitUntil(
      runEarthquakeSync().catch((error) =>
        console.error('[ERROR] Earthquake polling error', error)
      )
    );
  },
} satisfies ExportedHandler<Bindings>;
