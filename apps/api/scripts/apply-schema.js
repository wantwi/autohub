/**
 * Applies SQL migrations in supabase/migrations to DATABASE_URL.
 * Runs each statement separately and tracks applied files in public.schema_migrations.
 *
 * Optional: set APPLY_SCHEMA_FILE=<filename.sql> to run one file only.
 * Run from apps/api: npm run apply-schema
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import '../src/lib/dnsIpv4First.js';
import { buildPoolOptions } from '../src/lib/pgPoolConfig.js';
import { splitPgStatements } from './lib/splitPgStatements.js';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', '..', '..', 'supabase', 'migrations');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing in apps/api/.env');
  process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
  console.error('Migrations directory not found:', migrationsDir);
  process.exit(1);
}

const requestedFile = process.env.APPLY_SCHEMA_FILE;
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b));

const filesToApply = requestedFile
  ? migrationFiles.filter((name) => name === requestedFile)
  : migrationFiles;

if (!filesToApply.length) {
  if (requestedFile) {
    console.error(`Requested migration file not found: ${requestedFile}`);
  } else {
    console.error('No SQL migration files found in:', migrationsDir);
  }
  process.exit(1);
}

const connectMs =
  Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS) || Number(process.env.APPLY_SCHEMA_TIMEOUT_MS) || 180_000;

const pool = new pg.Pool(
  await buildPoolOptions(process.env.DATABASE_URL, {
    max: 1,
    connectionTimeoutMillis: connectMs,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  })
);

let n = 0;
let currentFile = '';
try {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows: appliedRows } = await client.query(
      `SELECT filename FROM public.schema_migrations ORDER BY filename`
    );
    const applied = new Set(appliedRows.map((r) => r.filename));

    for (const file of filesToApply) {
      if (!requestedFile && applied.has(file)) {
        console.log(`SKIP: ${file} (already applied)`);
        continue;
      }
      currentFile = file;
      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      const statements = splitPgStatements(sql);
      for (let idx = 0; idx < statements.length; idx++) {
        const st = statements[idx];
        n = idx + 1;
        await client.query(st);
      }
      await client.query(
        `INSERT INTO public.schema_migrations (filename) VALUES ($1)
         ON CONFLICT (filename) DO NOTHING`,
        [file]
      );
      console.log(`OK: ${file} (${statements.length} statements)`);
    }
  } finally {
    client.release();
  }
  console.log(`Done: applied ${filesToApply.length} migration file(s).`);
} catch (e) {
  console.error('FAIL:', e.message);
  if (e.code) console.error('code:', e.code);
  if (currentFile) console.error(`file: ${currentFile}`);
  if (n > 0) console.error(`Stopped at statement ${n}.`);
  if (e.message?.includes('already exists')) {
    console.error('\nSome objects already exist. For incremental updates, run only new migration file(s).');
  }
  process.exit(1);
} finally {
  await pool.end();
}
