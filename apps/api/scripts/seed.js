/**
 * Seed demo data. Requires DATABASE_URL and applied migrations.
 * Run: npm run seed (from apps/api)
 */
import 'dotenv/config';
import '../src/lib/dnsIpv4First.js';
import { buildPoolOptions } from '../src/lib/pgPoolConfig.js';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const pool = new Pool(
  await buildPoolOptions(process.env.DATABASE_URL, {
    connectionTimeoutMillis: 120_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  })
);

async function ensureUser(client, { phone, email, fullName, role, isVerified }) {
  const ex = await client.query(`SELECT id FROM users WHERE phone = $1`, [phone]);
  if (ex.rows.length) return ex.rows[0].id;
  const { rows } = await client.query(
    `INSERT INTO users (phone, email, full_name, role, is_verified)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [phone, email ?? null, fullName, role, isVerified ?? false]
  );
  return rows[0].id;
}

async function main() {
  const { rows: tbl } = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1`
  );
  if (tbl.length === 0) {
    console.error(
      'Missing database tables. Run first:\n  npm run apply-schema\nOr paste supabase/migrations/20250323120000_init.sql into Supabase → SQL Editor → Run.'
    );
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await ensureUser(client, {
      phone: '+233200000001',
      email: 'admin@autohub.local',
      fullName: 'Pilot Admin',
      role: 'admin',
      isVerified: true,
    });

    await ensureUser(client, {
      phone: '+233200000002',
      fullName: 'Kofi Buyer',
      role: 'buyer',
    });

    const dealerUserId = await ensureUser(client, {
      phone: '+233200000003',
      fullName: 'Ama Dealer',
      role: 'dealer',
    });
    await client.query(`UPDATE users SET role = 'dealer' WHERE id = $1`, [dealerUserId]);

    let dealerId;
    const dEx = await client.query(`SELECT id FROM dealers WHERE user_id = $1`, [dealerUserId]);
    if (dEx.rows.length) {
      dealerId = dEx.rows[0].id;
    } else {
      const ins = await client.query(
        `INSERT INTO dealers (
           user_id, shop_name, description, phone_business, location_text, lat, lng,
           is_verified, verified_at, operating_hours
         ) VALUES (
           $1, 'Ama Parts Abossey', 'Engine & electrical', '+233200000003',
           'Abossey Okai, Shop 23B', 5.6037, -0.1870, true, now(),
           '{"mon":"8am-6pm"}'::jsonb
         ) RETURNING id`,
        [dealerUserId]
      );
      dealerId = ins.rows[0].id;
    }

    const cnt = await client.query(`SELECT COUNT(*)::int AS c FROM parts WHERE dealer_id = $1`, [
      dealerId,
    ]);
    if (cnt.rows[0].c === 0) {
      await client.query(
        `INSERT INTO parts (
           dealer_id, name, description, category, condition, price, quantity,
           compatible_makes, compatible_models, compatible_years, images, part_number
         ) VALUES
         (
           $1, 'Alternator', 'OEM spec', 'Electrical', 'new', 850.0, 3,
           ARRAY['Toyota'], ARRAY['Corolla'], '[2010,2020)'::int4range,
           ARRAY[]::text[], 'ALT-001'
         ),
         (
           $1, 'Brake pads front', 'Ceramic', 'Body', 'new', 320.0, 10,
           ARRAY['Toyota'], ARRAY['Corolla'], '[2012,2018)'::int4range,
           ARRAY[]::text[], NULL
         )`,
        [dealerId]
      );
    }

    await client.query('COMMIT');
    console.log('Seed OK.');
    console.log('Phones: admin +233200000001, buyer +233200000002, dealer +233200000003');
    console.log('Use DEV_OTP in .env + verify-otp to obtain JWTs.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
