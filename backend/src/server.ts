import { createApp } from "./app";
import { env } from "./config/env";
import { startCronJobs } from "./infrastructure/cron/jobs";

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${env.port}`);
  if (env.nodeEnv !== "test") {
    startCronJobs();
  }
});

