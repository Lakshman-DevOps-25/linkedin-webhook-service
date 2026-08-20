import { logger } from "./config/logger.js";
import { connectMongo } from "./config/database.js";
import { initStorage } from "./services/storage/index.js";
import { startWorker } from "./jobs/changelog.worker.js";

/**
 * Poller worker — run as a SEPARATE process from the web server so ingestion
 * survives web restarts. The 28-day changelog window makes uptime critical.
 *   node src/worker.js
 */
async function main() {
  await connectMongo();
  await initStorage();
  startWorker();
  logger.info("worker up");
}

main().catch((err) => {
  logger.fatal({ err: err.message }, "worker failed to start");
  process.exit(1);
});
