import { HttpError } from '../lib/httpError.js';

/**
 * Express error handler — { error: { code, message, details? } }
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
  }
  if (err && err.name === 'ZodError') {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body or parameters',
        details: err.issues ?? err.errors,
      },
    });
  }
  if (err && err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }
  const errMsg = err && typeof err.message === 'string' ? err.message : '';
  if (
    errMsg.includes('Connection terminated due to connection timeout') ||
    errMsg.includes('timeout exceeded when trying to connect')
  ) {
    console.error('[database]', errMsg);
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message:
          'PostgreSQL connection timed out. Check DATABASE_URL and run `npm run probe-db` from apps/api. See README (Supabase / local Postgres).',
      },
    });
  }
  if (err && err.code === '42P01') {
    console.error('[database]', err.message);
    return res.status(503).json({
      error: {
        code: 'DATABASE_SCHEMA_MISSING',
        message:
          'Database tables are missing. From apps/api run: npm run apply-schema  (or paste supabase/migrations/20250323120000_init.sql into Supabase SQL Editor and run).',
      },
    });
  }
  if (err && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') && err.syscall === 'connect') {
    console.error('[database]', err.message);
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message:
          'Cannot reach PostgreSQL. Start the database (e.g. `docker compose up -d` from repo root) or set DATABASE_URL in apps/api/.env.',
      },
    });
  }
  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}
