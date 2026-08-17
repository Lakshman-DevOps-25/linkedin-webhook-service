import { Worker } from "bullmq";
import { QUEUE_NAME, getConnection } from "./changelog.queue.js";
import { pollMember } from "../services/poller.service.js";
import { logger } from "../config/logger.js";

/** Start the changelog worker. Run in its own process (see src/worker.js). */
export function startWorker() {
  const worker = new Worker(QUEUE_NAME, async (job) => pollMember(job.data.memberToken), {
    connection: getConnection(),
    concurrency: 5,
  });
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err: err.message }, "poll job failed"));
  worker.on("completed", (job) => logger.debug({ jobId: job.id }, "poll job done"));
  logger.info("changelog worker started");
  return worker;
}
