/**
 * Tries common Supabase Session pooler regions until SELECT 1 succeeds.
 * Reads password + project ref from DATABASE_URL (direct or pooler shape).
 * Run: node scripts/find-supabase-pooler.js
 * With working URL: updates ../.env DATABASE_URL line (backup recommended).
 */
import 'dotenv/config';
import '../src/lib/dnsIpv4First.js';
import { buildPoolOptions } from '../src/lib/pgPoolConfig.js';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

/** If no pooler accepts TCP, Postgres TLS will always time out — usually firewall/VPN/ISP. */
function tcpReachable(host, port, ms = 6000) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port, timeout: ms }, () => {
      s.destroy();
      resolve(true);
    });
    s.on('error', () => resolve(false));
    s.on('timeout', () => {
      s.destroy();
      resolve(false);
    });
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error('DATABASE_URL missing. Set it in apps/api/.env first (any Supabase URL with your password).');
  process.exit(1);
}

let ref;
let password;
try {
  const u = new URL(raw.replace(/^postgres:\/\//, 'postgresql://'));
  password = u.password ? decodeURIComponent(u.password) : '';
  const host = u.hostname;
  const direct = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (direct) ref = direct[1];
  else if (u.username?.includes('.')) ref = u.username.split('.').slice(1).join('.');
  else ref = null;
} catch {
  console.error('Could not parse DATABASE_URL');
  process.exit(1);
}

if (!ref || !password) {
  console.error('Could not derive project ref and password from DATABASE_URL.');
  console.error('Use: postgresql://postgres:PASSWORD@db.YOUR_REF.supabase.co:5432/postgres');
  process.exit(1);
}

const regions = [
  'eu-west-1',
  'eu-central-1',
  'us-east-1',
  'us-west-1',
  'ap-southeast-1',
  'ap-northeast-1',
  'ca-central-1',
  'sa-east-1',
  'ap-south-1',
];

const encPass = encodeURIComponent(password);

/** Supabase pooler hostname uses aws-0 or aws-1 depending on project — try both. */
function buildConn(region, port, poolShard) {
  const q = 'sslmode=verify-full';
  return `postgresql://postgres.${ref}:${encPass}@aws-${poolShard}-${region}.pooler.supabase.com:${port}/postgres?${q}`;
}

async function tryConn(conn) {
  const pool = new pg.Pool(
    await buildPoolOptions(conn, {
      connectionTimeoutMillis: 120_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    })
  );
  try {
    await pool.query('SELECT 1');
    return true;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log(`Project ref: ${ref}`);

  const probes = [
    ['aws-0-eu-west-1.pooler.supabase.com', 5432],
    ['aws-1-eu-west-1.pooler.supabase.com', 5432],
    ['aws-0-us-east-1.pooler.supabase.com', 5432],
    ['aws-1-us-east-1.pooler.supabase.com', 5432],
  ];
  let canReachPooler = false;
  for (const [h, p] of probes) {
    process.stdout.write(`TCP probe ${h}:${p} ... `);
    if (await tcpReachable(h, p)) {
      console.log('ok');
      canReachPooler = true;
      break;
    }
    console.log('failed');
  }
  if (!canReachPooler) {
    console.error(`
Your PC cannot reach Supabase on port 5432 (TCP never connects). Trying more regions will not help.

Fix the network:
  • Turn off VPN, or try phone hotspot / another Wi‑Fi.
  • Corporate networks often block outbound 5432 and 6543.
  • Windows: allow Node.js (or your terminal) through the firewall for outbound.
  • Run: npm run test-db-port

Develop without reaching Supabase:
  • Install PostgreSQL on Windows → create database "autohub" → run supabase/migrations/*.sql
  • Set DATABASE_URL=postgresql://postgres:PASSWORD@127.0.0.1:5432/autohub
  • See README "Option B — PostgreSQL installed on Windows".
`);
    process.exit(1);
  }

  for (const region of regions) {
    for (const port of [5432, 6543]) {
      for (const poolShard of [0, 1]) {
        const conn = buildConn(region, port, poolShard);
        process.stdout.write(`Trying aws-${poolShard} ${region} port ${port} ... `);
        try {
          await tryConn(conn);
          console.log('OK');
          console.log('\nUse this DATABASE_URL:\n', conn, '\n');

          if (fs.existsSync(envPath)) {
            let text = fs.readFileSync(envPath, 'utf8');
            const line = `DATABASE_URL=${conn}`;
            if (/^DATABASE_URL=/m.test(text)) {
              text = text.replace(/^DATABASE_URL=.*$/m, line);
            } else {
              text = `${line}\n${text}`;
            }
            fs.writeFileSync(envPath, text, 'utf8');
            console.log(`Updated ${envPath}`);
          }
          process.exit(0);
        } catch (e) {
          console.log(e.code || '', e.message?.split('\n')[0] || e);
        }
      }
    }
  }
  console.error(`
TCP reached a pooler, but no region accepted your password / Postgres handshake.
  • Reset DB password in Supabase and update DATABASE_URL.
  • Or paste the exact "Session pooler" URI from Dashboard → Connect.
`);
  process.exit(1);
}

main();
