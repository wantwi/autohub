import { loadEnv } from '../config/env.js';

/**
 * Send SMS via Africa's Talking. No-op log when API key missing (local dev).
 * @param {string} to E.164
 * @param {string} message
 */
export async function sendSms(to, message) {
  const env = loadEnv();
  if (!env.AFRICAS_TALKING_API_KEY) {
    console.info('[sms:stub]', to, message);
    return { stub: true };
  }
  const url = 'https://api.africastalking.com/version1/messaging';
  const body = new URLSearchParams({
    username: env.AFRICAS_TALKING_USERNAME,
    to,
    message,
    ...(env.AFRICAS_TALKING_SENDER_ID ? { from: env.AFRICAS_TALKING_SENDER_ID } : {}),
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apiKey: env.AFRICAS_TALKING_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[sms:error]', res.status, text);
    throw new Error(`SMS send failed: ${res.status}`);
  }
  return res.json();
}
