import { config } from "./config/index.js";
import { logger } from "./config/logger.js";
import { connectMongo } from "./config/database.js";
import { initStorage } from "./services/storage/index.js";
import { createApp } from "./app.js";

// Web entry point: connect infrastructure, build the app, and start listening.
async function main() {
  logger.debug("main: booting web server");
  await connectMongo();
  await initStorage();
  const app = createApp();
  app.listen(config.PORT, () => logger.info({ port: config.PORT }, "server listening"));
}

main().catch((err) => {
  logger.fatal({ err: err.message }, "failed to start");
  process.exit(1);
});
