import { logger } from "../config/logger.js";
// Liveness/readiness probe: returns ok plus a timestamp.
export function healthz(_req, res) {
  logger.debug("health.healthz: probe");
  res.json({ ok: true, ts: new Date().toISOString() });
}
