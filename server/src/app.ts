import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { authRouter } from './routes/auth.routes';
import { buybackRouter } from './routes/buyback.routes';
import { catalogRouter } from './routes/catalog.routes';
import { answersRouter } from './routes/answers.routes';
import { partnerLocationsRouter } from './routes/partnerLocations.routes';
import { partnersRouter } from './routes/partners.routes';
import { questionAnswersRouter } from './routes/questionAnswers.routes';
import { questionnaireConfigRouter } from './routes/questionnaireConfig.routes';
import { questionsRouter } from './routes/questions.routes';
import { rolesRouter } from './routes/roles.routes';
import { uploadsRouter } from './routes/uploads.routes';
import { usersRouter } from './routes/users.routes';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  // In development, reflect whatever origin the request came from (rather than a
  // single hardcoded CLIENT_ORIGIN) so the app also works when previewed through a
  // forwarded/tunneled URL whose host isn't known ahead of time. The frontend's Vite
  // dev server proxy (see frontend/vite.config.ts) avoids cross-origin calls entirely
  // for local development, but this keeps direct API access (curl, Postman, a
  // separately-hosted frontend) working too.
  app.use(cors({ origin: env.nodeEnv === 'development' ? true : env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', dataDriver: env.dataDriver, timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/buyback', buybackRouter);
  // Partner/vendor onboarding hierarchy: Partner -> Partner Location -> User -> Role.
  app.use('/api/partners', partnersRouter);
  app.use('/api/partner-locations', partnerLocationsRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/users', usersRouter);
  // Questionnaire configuration module: master Questions/Answers, their
  // mapping, and the category/brand/partner resolution rules.
  app.use('/api/questions', questionsRouter);
  app.use('/api/answers', answersRouter);
  app.use('/api/question-answers', questionAnswersRouter);
  app.use('/api/questionnaire-config', questionnaireConfigRouter);
  // Uploaded ID documents / device photos - authenticated + ownership-checked,
  // never served as public static content. See routes/uploads.routes.ts.
  app.use('/api/uploads', uploadsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
