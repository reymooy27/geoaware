import type { Context } from 'hono';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { resetPrismaClient } from '../utils/prisma.js';

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

/** Prisma error codes that indicate a broken connection / stale pool. */
const RETRYABLE_PRISMA_CODES = new Set<string>([
  'P1016', // query timing out
  'P1017', // server has closed the connection
  'P1001', // database server unreachable
  'P1008', // operations timed out
  'P1009', // database already exists (connection established but...)
]);

function isConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_PRISMA_CODES.has(err.code);
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('Connection') ||
    message.includes('closed') ||
    message.includes('timeout') ||
    message.includes('ECONNRESET') ||
    message.includes('ENOTFOUND') ||
    message.includes('terminating connection')
  );
}

/**
 * Hono error handler. Replicates the exact response shapes the Express
 * middleware produced so API consumers see no behavioral change.
 */
export const onError = async (err: Error, c: Context) => {
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

  // Auto-reset Prisma pool on connection errors so the next request gets a
  // fresh client instead of inheriting the broken one.
  if (isConnectionError(err)) {
    logger.error({ error: err.message }, 'Connection error — resetting Prisma client');
    await resetPrismaClient();
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
