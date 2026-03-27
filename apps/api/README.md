# AutoHub API (Phase 1)

Node.js **Express** service in plain **JavaScript (ESM)**. PostgreSQL schema lives in [`../../supabase/migrations`](../../supabase/migrations).

## Quick start (local)

From **`apps/api`**:

1. `cp .env.example .env` (or keep your existing `.env`) — set **`DATABASE_URL`** and **`JWT_SECRET`** (≥16 chars).
2. `npm install`
3. **`npm run probe-db`** — must print `OK: database reachable`. If it fails, fix `DATABASE_URL` / network before relying on the API.
4. **`npm run apply-schema`** — runs that migration **statement-by-statement** (better on slow links than one huge query). If it still times out, raise **`APPLY_SCHEMA_TIMEOUT_MS`** or paste [`../../supabase/migrations/20250323120000_init.sql`](../../supabase/migrations/20250323120000_init.sql) into **Supabase → SQL Editor → Run**.
5. **`npm run dev`** — open **`http://localhost:<PORT>/v1/health`** (see `PORT` in `.env`). Point the web app at the same port (e.g. `VITE_API_BASE_URL=http://localhost:3002/v1` in `apps/web/.env`).

`GET /v1/health` uses a **short** DB connect timeout (~15s) so you get `database: disconnected` with a hint instead of hanging for minutes when Postgres is unreachable.

## Run without Docker (recommended if Docker Desktop won’t start)

You only need **Node.js 20+** and **any PostgreSQL 14+** reachable from your PC.

### Option A — Supabase (free, no local DB install)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database** → copy the **URI** (password from “Database password” when you created the project).  
   - Prefer the **Session mode** or **Transaction** pooler URI for server apps.  
   - Use SSL in the URI, e.g. `?sslmode=verify-full` (recommended for `pg` 8.x; avoids deprecation warnings vs `require`).
3. In Supabase: **SQL Editor → New query** → paste the full file [`../../supabase/migrations/20250323120000_init.sql`](../../supabase/migrations/20250323120000_init.sql) → **Run**.
4. In `apps/api`, copy `.env.example` to `.env` and set:
   - `DATABASE_URL=<your Supabase postgres URI>`
   - `JWT_SECRET=<any random string, at least 16 characters>`
   - Optional: `DEV_OTP=123456` for easy local login (non-production).
5. `npm install` then `npm run dev`.
6. Open `http://localhost:3000/v1/health` — `database` should be **`connected`**.

Optional: `npm run seed` for demo data.

**If every Supabase connection times out** (`Connection terminated due to connection timeout`, often with cause `Connection terminated unexpectedly`): **pg-pool** aborts the socket after **`DATABASE_CONNECTION_TIMEOUT_MS`** (default **120s** in this repo). On a very slow link or long TLS handshake to the pooler, raise it (e.g. `DATABASE_CONNECTION_TIMEOUT_MS=180000`). Your network may also block **5432** / **6543** — run `npm run test-db-port`. If the TCP probe is **ok** but **pg** still times out, Node may be preferring a broken **IPv6** path; the API sets **`dns.setDefaultResultOrder('ipv4first')`** (see `src/lib/dnsIpv4First.js`). Retry `npm run find-pooler` and `npm run dev`. Otherwise use **Option B** (local Postgres on `127.0.0.1`).

**SSL warning** (`sslmode=require` treated as verify-full): use **`?sslmode=verify-full`** in `DATABASE_URL`, or rely on **`src/lib/pgConnectionString.js`** which upgrades `require`/`prefer`/`verify-ca` automatically unless `uselibpqcompat=true`.

**`SELF_SIGNED_CERT_IN_CHAIN`** (fast failure, not a timeout): something on the network is intercepting TLS (corporate proxy, antivirus HTTPS scan). Fix the trust store (**`NODE_EXTRA_CA_CERTS`** to your org root CA) or, for **local dev only**, set **`DATABASE_SSL_NO_VERIFY=1`** in `apps/api/.env` (never in production).

**Supabase + Windows networking:** the app sets **`dns.setDefaultResultOrder('ipv4first')`** (`src/lib/dnsIpv4First.js`) and connects using the **hostname** from `DATABASE_URL` by default. If you only get **timeouts**, try **`DATABASE_PG_RESOLVE_IPV4=1`** in `apps/api/.env` (connects to the IPv4 address with TLS SNI). If you get **`ECONNRESET`**, keep that variable **unset** and try **transaction pooler `:6543`**, another network/VPN off, or **local Postgres** below.

### Option B — PostgreSQL installed on Windows

1. Install from [PostgreSQL Windows installer](https://www.postgresql.org/download/windows/) (remember the `postgres` user password).
2. Create a database named `autohub` (pgAdmin or `psql`).
3. Run the migration file against it (pgAdmin Query Tool or `psql -f supabase/migrations/20250323120000_init.sql`).
4. Set in `apps/api/.env`:  
   `DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/autohub`  
   plus `JWT_SECRET` as above, then `npm install` and `npm run dev`.

---

## Postgres + API in Docker (optional)

**Start Docker Desktop**, then from the **repo root** (not `apps/api`):

```bash
docker compose up --build -d
```

- Postgres runs on **5432** and applies `supabase/migrations/20250323120000_init.sql` automatically the **first** time the data volume is created.
- API runs on **http://localhost:3000** with `DATABASE_URL` pointing at that Postgres.

Check: `GET http://localhost:3000/v1/health` → `database` should be **`connected`**.

**Reset DB and re-apply schema:** `docker compose down -v` then `docker compose up --build -d`.

**Postgres only** (API on host with `npm run dev`): `docker compose up -d postgres` and set `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/autohub` in `.env`.

**Stop Docker API** before running `npm run dev` on port 3000, or set `PORT=3001` in `.env` to avoid conflicts.

**Troubleshooting:** `GET /v1/health` with `database: disconnected` means fix `DATABASE_URL` or run the migration — see **Run without Docker** above.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_SECRET` | yes | HMAC secret for JWT (min 16 chars) |
| `JWT_EXPIRES_IN` | no | Default `7d` |
| `PORT` | no | Default `3000` |
| `CORS_ORIGINS` | no | Comma-separated origins; default `http://localhost:5173` |
| `DATABASE_CONNECTION_TIMEOUT_MS` | no | Max wait when opening a new pooled connection (default `120000`, max `300000`) |
| `HEALTH_DB_TIMEOUT_MS` | no | Connect timeout used only for `GET /v1/health` (default `15000`, max `120000`) |
| `DATABASE_SSL_NO_VERIFY` | no | If `1` or `true`, disable TLS certificate verification (dev only; proxy / MITM debugging) |
| `DATABASE_POOL_IDLE_TIMEOUT_MS` | no | Idle client lifetime in ms; default **`0`** (do not drop idle clients — avoids slow Supabase reconnects). Set e.g. `300000` on memory-constrained hosts |
| `DATABASE_PG_RESOLVE_IPV4` | no | If `1` or `true`, connect to Supabase pooler/db host via resolved IPv4 + SNI (try only if hostname connects time out) |

### If Supabase still fails (`ECONNRESET`, timeouts, `SELF_SIGNED_CERT_IN_CHAIN`)

1. **Local Postgres (most reliable for dev)** — see **Option B — PostgreSQL installed on Windows** below, or `docker compose up -d postgres` from the repo root, then `DATABASE_URL=postgresql://postgres:...@127.0.0.1:5432/autohub`.
2. **Transaction pooler** — in Supabase **Connect**, switch to **Transaction** mode and use port **6543** (update `DATABASE_URL`). Fewer session features; fine for many APIs.
3. **Supabase IPv4 add-on** — enables a stable **IPv4** direct host for `db.<ref>.supabase.co` if your project needs it.
4. **Trust / proxy** — `SELF_SIGNED_CERT_IN_CHAIN`: set **`NODE_EXTRA_CA_CERTS`** to your org CA file, or **`DATABASE_SSL_NO_VERIFY=1`** only on your machine for debugging.
| `DEV_OTP` | no | If set (non-production), OTP verify accepts this code and logs it on request-otp |
| `PAYSTACK_SECRET_KEY` | for payments | Paystack secret |
| `PAYSTACK_WEBHOOK_SECRET` | for webhooks | Paystack dashboard signing secret |
| `AFRICAS_TALKING_*` | for real SMS | If omitted, SMS is logged to console only |
| `GOOGLE_CLIENT_ID` | for Google sign-in | If omitted, `POST /auth/google` returns 501 |

## Paystack webhook

Configure Paystack to POST to:

`https://<your-host>/v1/payments/webhook`

Use the same URL in local dev with a tunnel (e.g. ngrok). Set `PAYSTACK_WEBHOOK_SECRET` to verify `x-paystack-signature`.

## Scripts

- `npm start` — production server
- `npm run dev` — watch mode
- `npm run probe-db` — test `DATABASE_URL` with `SELECT 1`
- `npm run apply-schema` — run `supabase/migrations/20250323120000_init.sql` against `DATABASE_URL`
- `npm run seed` — demo data (requires schema applied)
- `npm run find-pooler` — discover Supabase pooler region (optional)
- `npm test` — unit tests (Paystack HMAC, etc.)

## Contract

Frontend integration: [`../../docs/API_CONTRACT.md`](../../docs/API_CONTRACT.md).

## Deploy (Railway)

Set the same env vars on Railway. Start command: `npm start` (repo root should be `apps/api` or set root directory in Railway to `apps/api`).
