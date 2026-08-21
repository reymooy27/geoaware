import { Request, Response, NextFunction } from 'express';

const logger = {
  info: (obj: any, msg: string) => console.log(`[INFO] ${msg}`, obj),
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }, 'HTTP Request');
  });
  
  next();
};