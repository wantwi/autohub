/**
 * One-shot: load .env, normalize URL, run SELECT 1. Exits 0 on success.
 * Run: node scripts/probe-db.js
 */
import 'dotenv/config';
import '../src/lib/dnsIpv4First.js';
import { buildPoolOptions } from '../src/lib/pgPoolConfig.js';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}
const pool = new pg.Pool(
  await buildPoolOptions(url, {
    connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS) || 120_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  })
);
try {
  await pool.query('SELECT 1');
  console.log('OK: database reachable');
  process.exit(0);
} catch (e) {
  console.error('FAIL:', e.message);
  if (e.cause) console.error('cause:', e.cause.message);
  if (e.code) console.error('code:', e.code);
  const msg = `${e.message} ${e.code || ''}`;
  if (msg.includes('SELF_SIGNED_CERT') || msg.includes('certificate')) {
    console.error(`
TLS trust issue (common: corporate proxy / antivirus HTTPS inspection).
  • Dev quick fix: add to apps/api/.env  DATABASE_SSL_NO_VERIFY=1
  • Proper fix: point Node at your org root CA, e.g.
      set NODE_EXTRA_CA_CERTS=C:\\path\\to\\corp-root-ca.pem
    (PowerShell: $env:NODE_EXTRA_CA_CERTS='C:\\path\\to\\corp-root-ca.pem')
`);
  }
  process.exit(1);
} finally {
  await pool.end();
}
