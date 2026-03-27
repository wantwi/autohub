import dotenv from 'dotenv';

dotenv.config();

const schema = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGINS:
    process.env.CORS_ORIGINS ||
    'http://localhost:5173,http://localhost:5176,http://127.0.0.1:5173,http://127.0.0.1:5176',
  DEV_OTP: process.env.DEV_OTP || '',
  AFRICAS_TALKING_API_KEY: process.env.AFRICAS_TALKING_API_KEY || '',
  AFRICAS_TALKING_USERNAME: process.env.AFRICAS_TALKING_USERNAME || 'sandbox',
  AFRICAS_TALKING_SENDER_ID: process.env.AFRICAS_TALKING_SENDER_ID || '',
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
  PAYSTACK_WEBHOOK_SECRET: process.env.PAYSTACK_WEBHOOK_SECRET || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@autohub.com',
};

export function loadEnv() {
  const missing = [];
  if (!schema.DATABASE_URL) missing.push('DATABASE_URL');
  if (!schema.JWT_SECRET || schema.JWT_SECRET.length < 16) missing.push('JWT_SECRET (min 16 chars)');
  if (missing.length) {
    throw new Error(`Missing or invalid env: ${missing.join(', ')}`);
  }
  return schema;
}

export const env = schema;
