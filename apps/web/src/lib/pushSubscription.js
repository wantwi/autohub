import { apiJson } from './api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const registration = await navigator.serviceWorker.ready

  const vapidKey =
    import.meta.env.VITE_VAPID_PUBLIC_KEY ||
    (await apiJson('/push/vapid-key').then((r) => r.data?.publicKey || r.publicKey))

  if (!vapidKey) return false

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  })

  const json = subscription.toJSON()
  await apiJson('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  })

  localStorage.setItem('autohub-push-subscribed', '1')
  return true
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    await apiJson('/push/unsubscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    }).catch(() => {})
  }

  localStorage.removeItem('autohub-push-subscribed')
}

export function isPushSubscribed() {
  return localStorage.getItem('autohub-push-subscribed') === '1'
}

export function hasDismissedPushPrompt() {
  return localStorage.getItem('autohub-push-prompt-dismissed') === '1'
}

export function dismissPushPrompt() {
  localStorage.setItem('autohub-push-prompt-dismissed', '1')
}
