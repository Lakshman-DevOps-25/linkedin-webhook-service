import express from "express";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";
import { verifyHmac } from "../utils/crypto.js";

/**
 * Raw-body parser (needed BEFORE json parsing so the signature covers exact bytes).
 * Mount on the internal webhook route only.
 */
export const rawJson = express.raw({ type: "application/json", limit: "1mb" });

/**
 * Verify the INTERNAL webhook signature. This is NOT a LinkedIn signature —
 * LinkedIn does not call this endpoint. It authenticates YOUR re-emitters using
 * the shared INTERNAL_WEBHOOK_SECRET, with timestamp replay protection.
 *
 * Expects: X-Internal-Timestamp, X-Internal-Signature: sha256=<hmac(ts + "." + rawBody)>
 * On success, attaches the parsed JSON to req.parsedBody.
 */
export function verifyInternalSignature(req, res, next) {
  logger.debug("verifyInternalSignature: checking timestamp + HMAC");
  const ts = req.get("X-Internal-Timestamp");
  const sig = req.get("X-Internal-Signature");
  const raw = req.body instanceof Buffer ? req.body : Buffer.from("");

  const skew = Math.abs(Date.now() - Number(ts));
  if (!ts || Number.isNaN(skew) || skew > config.INTERNAL_WEBHOOK_MAX_SKEW_MS) {
    logger.warn({ skew }, "internal webhook rejected: stale/missing timestamp");
    return res.status(401).json({ error: "stale or missing timestamp" });
  }

  const signingInput = Buffer.concat([Buffer.from(`${ts}.`), raw]);
  if (!verifyHmac(signingInput, sig, config.INTERNAL_WEBHOOK_SECRET)) {
    logger.warn("internal webhook rejected: bad signature");
    return res.status(401).json({ error: "invalid signature" });
  }

  try {
    req.parsedBody = JSON.parse(raw.toString("utf8"));
  } catch (err) {
    return res.status(400).json({ error: "invalid JSON", detail: err.message });
  }
  next();
}
