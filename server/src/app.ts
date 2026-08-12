import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { authRouter } from './routes/auth.routes';
import { buybackRouter } from './routes/buyback.routes';
import { catalogRouter } from './routes/catalog.routes';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  // Mock file storage served statically - swap for S3/CDN URLs in production.
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', dataDriver: env.dataDriver, timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/buyback', buybackRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
