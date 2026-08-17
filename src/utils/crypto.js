import crypto from "node:crypto";
import { logger } from "../config/logger.js";

// Constant-time HMAC-SHA256 verification for the internal webhook signature.
export function verifyHmac(raw, signatureHeader, secret) {
  logger.debug("verifyHmac: verifying internal signature (secret not logged)");
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(signatureHeader).replace(/^sha256=/, ""), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Compute a lowercase hex HMAC-SHA256 of `message` keyed by `secret`.
// Used to build LinkedIn's webhook challengeResponse.
export function hmacHex(message, secret) {
  logger.debug("hmacHex: computing hex HMAC (inputs not logged)");
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

// Verify LinkedIn's signed event POST. LinkedIn signs the raw body with the app
// client secret; the digest is compared constant-time. Encoding can vary by
// product, so we accept hex or base64 defensively. Confirm against your product's docs.
export function verifyLinkedInSignature(raw, signatureHeader, secret) {
  logger.debug("verifyLinkedInSignature: verifying LinkedIn event signature");
  if (!signatureHeader || !secret) return false;
  const provided = String(signatureHeader).replace(/^sha256=/i, "").trim();
  const hex = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const b64 = crypto.createHmac("sha256", secret).update(raw).digest("base64");
  const safeEq = (a, b) => {
    const ba = Buffer.from(a), bb = Buffer.from(b);
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  };
  return safeEq(provided, hex) || safeEq(provided, b64);
}
