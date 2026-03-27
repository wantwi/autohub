/**
 * Normalize Ghana-style input toward E.164 (+233...).
 * @param {string} raw
 */
export function normalizePhone(raw) {
  let p = String(raw).replace(/\s/g, '');
  if (!p) return p;
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) return `+233${p.slice(1)}`;
  if (p.startsWith('233')) return `+${p}`;
  return p;
}
