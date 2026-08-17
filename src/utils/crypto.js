import crypto from "node:crypto";
import { config } from "../config/index.js";

const KEY = Buffer.from(config.TOKEN_ENCRYPTION_KEY, "hex");
const ALGO = "aes-256-gcm";

// Encrypt a secret with AES-256-GCM for storage at rest; returns "iv:tag:ciphertext" (base64).
export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

// Reverse encrypt(): decrypt an "iv:tag:ciphertext" payload back to plaintext.
export function decrypt(payload) {
  const [ivB64, tagB64, dataB64] = String(payload).split(":");
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

// Constant-time HMAC-SHA256 verification for the internal webhook signature.
export function verifyHmac(raw, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(signatureHeader).replace(/^sha256=/, ""), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
