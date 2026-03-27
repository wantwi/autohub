import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadEnv } from './config/env.js';
import v1Router from './routes/v1/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { paystackWebhookStack } from './routes/paymentsWebhook.js';

export function createApp() {
  const env = loadEnv();
  const origins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: origins.length ? origins : true,
      allowedHeaders: ['Authorization', 'Content-Type'],
      // Cache browser preflight (OPTIONS) so repeated API calls skip an extra round trip.
      maxAge: 86_400,
    })
  );

  app.post('/v1/payments/webhook', ...paystackWebhookStack);

  app.use(express.json({ limit: '1mb' }));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  });
  app.use(globalLimiter);

  app.use('/v1', v1Router);

  app.use(errorHandler);
  return app;
}
