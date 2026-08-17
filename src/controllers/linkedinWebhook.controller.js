import { config } from "../config/index.js";
import { logger } from "../config/logger.js";
import { hmacHex, verifyLinkedInSignature } from "../utils/crypto.js";

/**
 * LinkedIn webhook CHALLENGE handler (GET).
 *
 * When you click "Test this URL" in the developer portal, LinkedIn sends a GET
 * with a `challengeCode` query param. To validate, we must reply 200 with JSON:
 *   { challengeCode, challengeResponse }
 * where challengeResponse = hex HMAC-SHA256(challengeCode) keyed by the app's
 * CLIENT SECRET. Getting this right is what makes the portal test pass.
 */
export function challenge(req, res) {
  logger.debug({ hasCode: !!req.query.challengeCode }, "linkedin.challenge: validation request");
  const challengeCode = req.query.challengeCode;
  if (!challengeCode) {
    return res.status(400).json({ error: "missing challengeCode" });
  }
  if (!config.LINKEDIN_CLIENT_SECRET) {
    logger.error("LINKEDIN_CLIENT_SECRET is not set — cannot answer the challenge");
    return res.status(500).json({ error: "server missing LINKEDIN_CLIENT_SECRET" });
  }
  const challengeResponse = hmacHex(String(challengeCode), config.LINKEDIN_CLIENT_SECRET);
  // LinkedIn expects exactly these two fields echoed back.
  return res.status(200).json({ challengeCode: String(challengeCode), challengeResponse });
}

/**
 * LinkedIn webhook EVENT receiver (POST).
 *
 * After validation, LinkedIn POSTs real notifications (for this app: member
 * verification / profile status changes — NOT messages). LinkedIn signs the raw
 * body with the client secret; we verify it, log the event, and 200. These are
 * not message events, so they are intentionally NOT sent to the message archiver.
 */
export function receiveEvent(req, res) {
  logger.debug("linkedin.receiveEvent: event POST received");
  const raw = req.body instanceof Buffer ? req.body : Buffer.from("");
  const sig = req.get("X-LI-Signature") || req.get("x-li-signature");

  if (config.LINKEDIN_CLIENT_SECRET && sig) {
    const ok = verifyLinkedInSignature(raw, sig, config.LINKEDIN_CLIENT_SECRET);
    if (!ok) {
      logger.warn("linkedin.receiveEvent: signature verification failed");
      return res.status(401).json({ error: "invalid signature" });
    }
  } else {
    // No signature/secret: accept but flag, so you notice in logs during testing.
    logger.warn("linkedin.receiveEvent: no signature/secret — accepting unverified (dev only)");
  }

  let payload;
  try {
    payload = JSON.parse(raw.toString("utf8") || "{}");
  } catch {
    payload = { unparsed: raw.toString("utf8") };
  }
  logger.info({ event: payload }, "linkedin.receiveEvent: profile/verification notification");

  // Acknowledge quickly so LinkedIn doesn't retry.
  return res.status(200).json({ received: true });
}
