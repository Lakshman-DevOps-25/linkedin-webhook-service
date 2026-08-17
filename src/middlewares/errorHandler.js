import { logger } from "../config/logger.js";

/** Wrap async controllers so thrown errors reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) => {
  logger.debug({ path: req.path }, "asyncHandler: invoking route handler");
  return Promise.resolve(fn(req, res, next)).catch(next);
};

/** Centralized error handler (must be registered last). */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  logger.debug("errorHandler: handling error");
  logger.error({ err: err.message }, "unhandled error");
  res.status(err.status || 500).json({ error: err.expose ? err.message : "internal error" });
}
