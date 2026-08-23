import type { Context } from 'hono';
import { ZodError } from 'zod';

const logger = {
  warn: (obj: unknown, msg: string) => console.warn(`[WARN] ${msg}`, obj),
  error: (obj: unknown, msg: string) => console.error(`[ERROR] ${msg}`, obj),
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

/**
 * Hono error handler. Replicates the exact response shapes the Express
 * middleware produced so API consumers see no behavioral change.
 */
export const onError = (err: Error, c: Context) => {
  if (err instanceof ZodError) {
    return c.json(
      {
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: err.flatten().fieldErrors,
      },
      400
    );
  }

  if (err instanceof AppError) {
    logger.warn({ error: err.message, code: err.code }, 'Application error');
    return c.json(
      {
        error: err.message,
        code: err.code,
        details: err.details,
      },
      // Hono types status as union; runtime accepts any number.
      err.statusCode as 400
    );
  }

  logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');

  return c.json(
    {
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
    },
    500
  );
};

export const notFound = (c: Context) =>
  c.json({ error: 'Not Found', code: 'NOT_FOUND' }, 404);
