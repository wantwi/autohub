import dns from 'dns';
import { createRequire } from 'module';
import { normalizePgDatabaseUrl } from './pgConnectionString.js';

const require = createRequire(import.meta.url);
const { parseIntoClientConfig } = require('pg-connection-string');

/** Direct Supabase DB host — same IPv4 + TLS SNI fix as pooler. */
const DB_SUPABASE_CO = /^db\.[a-z0-9]+\.supabase\.co$/i;

/**
 * Build node-postgres Pool/Client options from DATABASE_URL.
 *
 * Optional IPv4 rewrite (off by default): some networks hang on IPv6 to Supabase; others reset (ECONNRESET)
 * when connecting to the pooler by resolved IP. Use hostname + `dnsIpv4First` unless you opt in.
 *
 * Set `DATABASE_PG_RESOLVE_IPV4=1` to connect to the A record with TLS `servername` set to the pooler hostname.
 *
 * @param {string} databaseUrl
 * @param {Record<string, unknown>} [overrides] merged last
 */
export async function buildPoolOptions(databaseUrl, overrides = {}) {
  const normalized = normalizePgDatabaseUrl(databaseUrl);
  /** @type {Record<string, unknown>} */
  const cfg = { ...parseIntoClientConfig(normalized) };

  for (const k of ['sslmode', 'uselibpqcompat']) {
    if (k in cfg) delete cfg[k];
  }

  const host = cfg.host;
  const forceIpv4 =
    process.env.DATABASE_PG_RESOLVE_IPV4 === '1' || process.env.DATABASE_PG_RESOLVE_IPV4 === 'true';
  if (forceIpv4 && typeof host === 'string' && host.length > 0) {
    const useIpv4Sni = host.includes('pooler.supabase.com') || DB_SUPABASE_CO.test(host);
    if (useIpv4Sni) {
      try {
        const { address } = await dns.promises.lookup(host, { family: 4 });
        cfg.host = address;
        const prev = cfg.ssl;
        const base = prev === true ? {} : typeof prev === 'object' && prev !== null ? { ...prev } : {};
        cfg.ssl = { ...base, servername: host };
      } catch {
        /* keep hostname */
      }
    }
  }

  const merged = { ...cfg, ...overrides };

  const noVerify = process.env.DATABASE_SSL_NO_VERIFY;
  const isSupabase =
    typeof host === 'string' &&
    (host.includes('supabase.co') || host.includes('supabase.com'));
  if (noVerify === '1' || noVerify === 'true' || isSupabase) {
    const ssl = merged.ssl;
    const base = ssl === true ? {} : typeof ssl === 'object' && ssl !== null ? { ...ssl } : {};
    merged.ssl = { ...base, rejectUnauthorized: false };
  }
  return merged;
}
