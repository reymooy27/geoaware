import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

const logger = {
  warn: (obj: any, msg: string) => console.warn(`[WARN] ${msg}`, obj),
  error: (obj: any, msg: string) => console.error(`[ERROR] ${msg}`, obj),
};

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: err.flatten().fieldErrors,
    });
  }

  if (err instanceof AppError) {
    logger.warn({ error: err.message, code: err.code }, 'Application error');
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');
  
  return res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
  });
};