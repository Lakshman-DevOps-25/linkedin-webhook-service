import { logger } from "../config/logger.js";

/** Wrap async controllers so thrown errors reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Centralized error handler (must be registered last). */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  logger.error({ err: err.message }, "unhandled error");
  res.status(err.status || 500).json({ error: err.expose ? err.message : "internal error" });
}
