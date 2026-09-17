import { createApp } from './app';
import { assertProductionSafety, env } from './config/env';

assertProductionSafety();

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[buyback-server] listening on http://localhost:${env.port} (data driver: ${env.dataDriver})`);
});
