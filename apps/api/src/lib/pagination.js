/**
 * @param {unknown} page
 * @param {unknown} pageSize
 */
export function parsePagination(page, pageSize) {
  const p = Math.max(1, Number(page) || 1);
  const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
  return { page: p, pageSize: ps, offset: (p - 1) * ps };
}
