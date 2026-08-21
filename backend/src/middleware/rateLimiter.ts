import { Request, Response, NextFunction } from 'express';

const requests = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100;

  const record = requests.get(ip);
  
  if (!record || now > record.resetTime) {
    requests.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({
      error: 'Too Many Requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    });
  }

  record.count++;
  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requests.entries()) {
    if (now > record.resetTime) {
      requests.delete(ip);
    }
  }
}, 300000); // Clean up every 5 minutes