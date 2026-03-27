/** Normalize list API responses (array or `{ items, meta }`). */
export function normalizeList(payload) {
  if (Array.isArray(payload)) return { items: payload, meta: {} }
  if (payload && typeof payload === 'object' && Array.isArray(payload.items)) {
    return { items: payload.items, meta: payload.meta || {} }
  }
  return { items: [], meta: {} }
}
