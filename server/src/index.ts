import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[buyback-server] listening on http://localhost:${env.port} (data driver: ${env.dataDriver})`);
});
