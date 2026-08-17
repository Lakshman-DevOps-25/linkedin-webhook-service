import crypto from "node:crypto";

/**
 * Local test client for the INTERNAL webhook. Signs a payload exactly the way
 * your re-emitter should, so you can exercise the endpoint end-to-end.
 *
 * Usage:
 *   INTERNAL_WEBHOOK_SECRET=... node test/send-internal-webhook.js
 */
const SECRET = process.env.INTERNAL_WEBHOOK_SECRET || "change-me-min-16-chars";
const URL = process.env.WEBHOOK_URL || "http://localhost:4000/internal/webhook/messages";

const payload = {
  tenantId: "acme-fs",
  events: [
    {
      id: "urn:li:activity:TEST-0001",
      resourceName: "messaging.conversations.messages",
      method: "CREATE",
      capturedAt: Date.now(),
      activityStatus: "NEW",
      processedActivity: {
        conversationId: "urn:li:conv:local-1",
        createdAt: Date.now(),
        from: { urn: "urn:li:member:1", name: "Test Sender" },
        recipients: [{ urn: "urn:li:member:2", name: "Test Recipient" }],
        body: "Local webhook test message with an attachment.",
        attachments: [
          { type: "document", url: "https://example.com/sample.pdf", contentType: "application/pdf" },
        ],
      },
    },
  ],
};

const raw = Buffer.from(JSON.stringify(payload));
const ts = String(Date.now());
const signingInput = Buffer.concat([Buffer.from(`${ts}.`), raw]);
const sig = "sha256=" + crypto.createHmac("sha256", SECRET).update(signingInput).digest("hex");

const res = await fetch(URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Internal-Timestamp": ts,
    "X-Internal-Signature": sig,
  },
  body: raw,
});
console.log(res.status, await res.text());
