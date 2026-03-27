import '../lib/dnsIpv4First.js';
import pg from 'pg';
import { loadEnv } from '../config/env.js';
import { buildPoolOptions } from '../lib/pgPoolConfig.js';

const { Pool } = pg;

/** @returns {number} */
function connectionTimeoutMillis() {
  const raw = process.env.DATABASE_CONNECTION_TIMEOUT_MS;
  if (raw === undefined || raw === '') return 120_000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 5000) return 120_000;
  return Math.min(Math.floor(n), 300_000);
}

/**
 * How long an idle pooled client may sit before removal. Default 0 = never (best for remote DB dev).
 * pg-pool default is 10s — far too aggressive for Supabase (every request re-handshakes TLS).
 * @returns {number}
 */
function idleTimeoutMillis() {
  const raw = process.env.DATABASE_POOL_IDLE_TIMEOUT_MS;
  if (raw === undefined || raw === '') return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), 3_600_000);
}

/** @param {Error} err */
function isTransientConnectionError(err) {
  const msg = err?.message ?? '';
  return (
    msg.includes('Connection terminated') ||
    msg.includes('ECONNRESET') ||
    msg.includes('socket hang up') ||
    msg.includes('EPIPE') ||
    msg.includes('connection is insecure') ||
    err?.code === 'ECONNRESET' ||
    err?.code === 'EPIPE'
  );
}

let pool;
let wrappedPool;

/**
 * Resolve Supabase host → IPv4 + SNI and create the shared pool. Call once before accepting traffic.
 */
export async function warmPool() {
  if (pool) return wrappedPool;
  const { DATABASE_URL } = loadEnv();
  const opts = await buildPoolOptions(DATABASE_URL, {
    max: 20,
    connectionTimeoutMillis: connectionTimeoutMillis(),
    idleTimeoutMillis: idleTimeoutMillis(),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  pool = new Pool(opts);
  pool.on('error', (error) => {
    console.error('Postgres pool idle client error:', error?.message ?? error);
  });
  wrappedPool = wrapPoolWithRetry(pool);
  await wrappedPool.query('SELECT 1');
  return wrappedPool;
}

/**
 * Wrap a pg Pool so that `.query()` transparently retries once on stale-connection errors.
 * All other methods (connect, end, on, etc.) are forwarded unchanged.
 */
function wrapPoolWithRetry(rawPool, maxRetries = 1) {
  return new Proxy(rawPool, {
    get(target, prop, receiver) {
      if (prop !== 'query') return Reflect.get(target, prop, receiver);
      return async function queryWithRetry(...args) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await target.query(...args);
          } catch (err) {
            if (isTransientConnectionError(err) && attempt < maxRetries) {
              console.warn(
                `[db-retry] Transient error on attempt ${attempt + 1}, retrying:`,
                err.message,
              );
              continue;
            }
            throw err;
          }
        }
      };
    },
  });
}

export function getPool() {
  if (!wrappedPool) {
    throw new Error(
      'Database pool not initialized: warmPool() must run before handling requests (server startup bug).'
    );
  }
  return wrappedPool;
}

/**
 * One-off pool for health checks — short connect timeout.
 * @param {number} [connectMs]
 */
export async function pingDatabase(connectMs = 15000) {
  const { DATABASE_URL } = loadEnv();
  const opts = await buildPoolOptions(DATABASE_URL, {
    max: 1,
    connectionTimeoutMillis: connectMs,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  const ephemeral = new Pool(opts);
  try {
    await ephemeral.query('SELECT 1');
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  } finally {
    await ephemeral.end();
  }
}

