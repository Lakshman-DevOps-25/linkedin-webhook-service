import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";

export const QUEUE_NAME = "linkedin-changelog";

let connection;
let queue;

// Lazily create (and memoize) the shared ioredis connection for BullMQ.
export function getConnection() {
  if (!connection) {
    console.log("creating redis connection to", config.REDIS_URL);
    connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
    connection.on("error", (err) => logger.error({ err: err.message }, "redis error"));
  }
  return connection;
}

// Lazily create (and memoize) the changelog queue.
export function getQueue() {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: getConnection() });
  return queue;
}

/** Idempotent repeatable poll per member (jobId keyed by member). */
export async function schedulePoll(memberToken) {
  await getQueue().add(
    "poll",
    { memberToken },
    {
      jobId: `poll:${memberToken}`,
      repeat: { every: config.CHANGELOG_POLL_INTERVAL_MS },
      removeOnComplete: 100,
      removeOnFail: 500,
    }
  );
  logger.info({ memberToken }, "poll scheduled");
}
