/**
 * @typedef {Object} AppEnv
 * @property {string} apiBaseUrl
 * @property {string} paystackPublicKey
 * @property {string} googleMapsApiKey
 * @property {string} googleClientId
 * @property {string} cloudinaryCloudName
 * @property {string} cloudinaryUploadPreset
 */

const REQUIRED = ['VITE_API_BASE_URL']

/** @returns {AppEnv} */
export function getEnv() {
  const e = import.meta.env
  for (const key of REQUIRED) {
    if (!e[key]) {
      console.warn(`[AutoHub] Missing ${key} — using dev fallback where applicable`)
    }
  }
  return {
    apiBaseUrl: (e.VITE_API_BASE_URL || 'http://localhost:3000/v1').replace(/\/$/, ''),
    paystackPublicKey: e.VITE_PAYSTACK_PUBLIC_KEY || '',
    googleMapsApiKey: e.VITE_GOOGLE_MAPS_API_KEY || '',
    googleClientId: e.VITE_GOOGLE_CLIENT_ID || '',
    cloudinaryCloudName: e.VITE_CLOUDINARY_CLOUD_NAME || '',
    cloudinaryUploadPreset: e.VITE_CLOUDINARY_UPLOAD_PRESET || '',
  }
}
