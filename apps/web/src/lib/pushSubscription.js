import { apiJson } from './api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

async function getVapidKey() {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (envKey) return envKey
  const resp = await apiJson('/push/vapid-key')
  return resp.data?.publicKey || resp.publicKey || null
}

async function registerSubscriptionOnServer(subscription) {
  const json = subscription.toJSON()
  await apiJson('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported on this browser.')
  }

  const permission = await Notification.requestPermission()
  if (permission === 'denied') {
    throw new Error('Notification permission was denied. Enable it in browser settings.')
  }
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const registration = await navigator.serviceWorker.ready
  const vapidKey = await getVapidKey()
  if (!vapidKey) throw new Error('Push configuration missing. Please try again later.')

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  })

  await registerSubscriptionOnServer(subscription)

  localStorage.setItem('autohub-push-subscribed', '1')
  return true
}

/**
 * Checks if the browser's actual PushManager subscription is still valid.
 * If localStorage says subscribed but the real subscription is gone (e.g. after
 * a service worker update), re-subscribes silently.
 */
export async function syncPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (!localStorage.getItem('autohub-push-subscribed')) return
  if (Notification.permission !== 'granted') {
    localStorage.removeItem('autohub-push-subscribed')
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()

    if (existing) {
      await registerSubscriptionOnServer(existing)
      return
    }

    const vapidKey = await getVapidKey()
    if (!vapidKey) return

    const newSub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
    await registerSubscriptionOnServer(newSub)
  } catch {
    localStorage.removeItem('autohub-push-subscribed')
  }
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
