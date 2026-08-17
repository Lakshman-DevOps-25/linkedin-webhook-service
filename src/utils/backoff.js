import { logger } from "../config/logger.js";

// Promise-based delay helper.
const sleep = (ms) => {
  logger.debug({ ms }, "sleep: delaying");
  return new Promise((r) => setTimeout(r, ms));
};

export class HttpError extends Error {
  constructor(status, message, retryAfterMs = null) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

// Classify an error as retryable (429/5xx/network) vs. fatal (other 4xx).
export function isRetryable(err) {
  logger.debug({ status: err && err.status }, "isRetryable: classifying error");
  if (err instanceof HttpError) return err.status === 429 || err.status >= 500;
  return true;
}

// Run fn with exponential backoff + full jitter, honoring Retry-After when present.
export async function withBackoff(fn, { retries = 5, baseMs = 500, maxMs = 30_000, label = "op" } = {}) {
  logger.debug({ label, retries }, "withBackoff: starting retryable op");
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries || !isRetryable(err)) {
        logger.error({ err: err.message, attempt, label }, "giving up after retries");
        throw err;
      }
      const backoff = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
      const jitter = Math.random() * backoff;
      const wait = err?.retryAfterMs ?? jitter;
      logger.warn({ label, attempt, waitMs: Math.round(wait), status: err.status }, "retrying");
      await sleep(wait);
    }
  }
}
