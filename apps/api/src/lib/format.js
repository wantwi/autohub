/**
 * Recursively map object keys from snake_case to camelCase (Postgres rows → JSON API).
 * @param {unknown} value
 * @returns {unknown}
 */
export function keysToCamel(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(keysToCamel);
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return value;
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = keysToCamel(v);
  }
  return out;
}
