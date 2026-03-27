import { getEnv } from './env'
import { useAuthStore } from '@/stores/authStore'

/**
 * @typedef {Object} ApiErrorShape
 * @property {string} [message]
 * @property {{ code?: string, message?: string, details?: unknown }} [error]
 */

export class ApiError extends Error {
  /** @param {number} status */
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

/**
 * @param {string} path
 * @param {RequestInit & { skipAuth?: boolean }} [init]
 */
export async function apiFetch(path, init = {}) {
  const { apiBaseUrl } = getEnv()
  const url = path.startsWith('http') ? path : `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  const skipAuth = init.skipAuth === true
  const token = useAuthStore.getState().token
  if (!skipAuth && token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const { skipAuth: _s, ...rest } = init
  const res = await fetch(url, { ...rest, headers })
  const text = await res.text()
  /** @type {unknown} */
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }
  }
  if (!res.ok) {
    const obj = data && typeof data === 'object' ? data : {}
    const errObj = /** @type {ApiErrorShape} */ (obj)
    const msg =
      errObj.error?.message ||
      errObj.message ||
      errObj.error?.code ||
      res.statusText ||
      'Request failed'
    throw new ApiError(msg, res.status, data)
  }
  return data
}

/**
 * Same as apiFetch but unwraps `{ data: T }` if present (backend contract).
 * @param {string} path
 * @param {RequestInit & { skipAuth?: boolean }} [init]
 */
export async function apiJson(path, init) {
  const data = await apiFetch(path, init)
  if (data && typeof data === 'object' && 'data' in data) {
    return /** @type {any} */ (data).data
  }
  return data
}

/**
 * Upload a FormData body (e.g. file upload). Does NOT set Content-Type
 * so the browser can set the multipart boundary automatically.
 * @param {string} path
 * @param {FormData} formData
 */
export async function apiUpload(path, formData) {
  const { apiBaseUrl } = getEnv()
  const url = path.startsWith('http') ? path : `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`
  const headers = new Headers()
  const token = useAuthStore.getState().token
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(url, { method: 'POST', headers, body: formData })
  const text = await res.text()
  let data = null
  if (text) {
    try { data = JSON.parse(text) } catch { data = { raw: text } }
  }
  if (!res.ok) {
    const obj = data && typeof data === 'object' ? data : {}
    const msg = obj.error?.message || obj.message || obj.error?.code || res.statusText || 'Upload failed'
    throw new ApiError(msg, res.status, data)
  }
  if (data && typeof data === 'object' && 'data' in data) return data.data
  return data
}

/**
 * Download a file from the API as a blob and trigger browser save.
 * @param {string} path
 * @param {string} filename
 */
export async function apiDownload(path, filename) {
  const { apiBaseUrl } = getEnv()
  const url = path.startsWith('http') ? path : `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`
  const headers = new Headers()
  const token = useAuthStore.getState().token
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(url, { headers })
  if (!res.ok) throw new ApiError('Download failed', res.status)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
