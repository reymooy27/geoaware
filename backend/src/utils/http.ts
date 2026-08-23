import type { Context } from 'hono';

/**
 * Parse a JSON request body tolerantly: an absent or malformed body yields {}
 * so downstream Zod schemas produce proper 400 validation errors instead of a
 * raw SyntaxError bubbling up as a 500.
 */
export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}
