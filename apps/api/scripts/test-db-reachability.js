/**
 * Tests raw TCP to Supabase pooler (no Postgres auth). If this fails, pg will timeout too.
 * Run: node scripts/test-db-reachability.js
 */
import 'dotenv/config';
import net from 'net';

const targets = [
  ['aws-0-eu-central-1.pooler.supabase.com', 5432],
  ['aws-0-eu-central-1.pooler.supabase.com', 6543],
  ['aws-0-eu-west-1.pooler.supabase.com', 5432],
];

try {
  const u = new URL(process.env.DATABASE_URL?.replace(/^postgres:\/\//, 'postgresql://') || 'http://x');
  if (u.hostname?.includes('supabase.co')) {
    targets.push([u.hostname, Number(u.port) || 5432]);
  }
} catch {
  /* ignore */
}

function tryTcp(host, port, ms = 8000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: ms }, () => {
      socket.destroy();
      resolve({ ok: true });
    });
    socket.on('error', (e) => resolve({ ok: false, err: e.code || e.message }));
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ok: false, err: 'ETIMEDOUT' });
    });
  });
}

async function main() {
  console.log('Testing TCP reachability (firewall / network check)...\n');
  for (const [host, port] of targets) {
    process.stdout.write(`${host}:${port} ... `);
    const r = await tryTcp(host, port);
    console.log(r.ok ? 'REACHABLE' : `BLOCKED/FAIL (${r.err})`);
  }
  console.log(`
If pooler ports show BLOCKED/FAIL:
  • Disable VPN or try another network (e.g. phone hotspot).
  • Corporate/school Wi‑Fi often blocks outbound 5432/6543.
  • Windows: Windows Security → Firewall → allow Node.js / your terminal outbound.
  • Run this script outside Cursor if the sandbox blocks outbound TCP.

PowerShell check:
  Test-NetConnection aws-0-eu-central-1.pooler.supabase.com -Port 5432
`);
}

main();
