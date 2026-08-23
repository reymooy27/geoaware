import type { MiddlewareHandler } from 'hono';

const requests = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

/**
 * Fixed-window rate limiter.
 *
 * NOTE: state is per-isolate on Workers — each concurrent isolate keeps its own
 * map, so effective limits are N× this value under load. For strict global
 * limits add a Cloudflare WAF rate-limiting rule (free plan includes basic
 * rules) or a Durable Object / KV-backed limiter later.
 */
export const rateLimiter: MiddlewareHandler = async (c, next) => {
  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  const now = Date.now();
  const record = requests.get(ip);

  // Lazy sweep — setInterval timers are not allowed on Workers.
  if (requests.size > 10_000 || Math.random() < 0.01) {
    for (const [key, rec] of requests.entries()) {
      if (now > rec.resetTime) requests.delete(key);
    }
  }

  if (!record || now > record.resetTime) {
    requests.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    await next();
    return;
  }

  if (record.count >= MAX_REQUESTS) {
    return c.json(
      {
        error: 'Too Many Requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      },
      429
    );
  }

  record.count++;
  await next();
};
