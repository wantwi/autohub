/**
 * pg 8.x treats sslmode=require|prefer|verify-ca like verify-full but emits a deprecation warning.
 * Map those to verify-full unless uselibpqcompat=true (explicit libpq semantics).
 * @param {string} url
 * @returns {string}
 */
export function normalizePgDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const hadPostgresScheme = /^postgres:\/\//i.test(url);
  const forParse = url.replace(/^postgres:\/\//i, 'postgresql://');
  let u;
  try {
    u = new URL(forParse);
  } catch {
    return url;
  }
  if (u.searchParams.get('uselibpqcompat') === 'true') return url;
  const mode = (u.searchParams.get('sslmode') || '').toLowerCase();
  if (mode === 'require' || mode === 'prefer' || mode === 'verify-ca') {
    u.searchParams.set('sslmode', 'verify-full');
    let out = u.toString();
    if (hadPostgresScheme) out = out.replace(/^postgresql:\/\//i, 'postgres://');
    return out;
  }
  return url;
}
