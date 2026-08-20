import crypto from "node:crypto";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";
import { buildAuthUrl, consumeState, exchangeCode } from "../services/linkedin/oauth.service.js";
import { encrypt } from "../utils/crypto.js";
import { MemberCursor } from "../models/index.js";
import { schedulePoll } from "../jobs/changelog.queue.js";

// Begin consent: redirect the member to LinkedIn's OAuth authorization screen.
export function start(_req, res) {
  res.redirect(buildAuthUrl());
}

// OAuth redirect handler: verify state, exchange code, store encrypted token, schedule polling.
export async function callback(req, res) {
  const { code, state, error, error_description } = req.query;
  if (error) return res.status(400).send(`LinkedIn error: ${error} — ${error_description || ""}`);
  if (!state || !consumeState(String(state))) return res.status(400).send("invalid state");

  const tok = await exchangeCode(String(code));
  const memberToken = crypto.createHash("sha256").update(tok.access_token).digest("hex").slice(0, 24);
  const tenantId = String(req.query.tenant || config.DEFAULT_TENANT_ID);

  await MemberCursor.updateOne(
    { memberToken },
    {
      $set: {
        memberToken,
        tenantId,
        accessTokenEnc: encrypt(tok.access_token),
        tokenExpiresAt: new Date(Date.now() + (tok.expires_in || 0) * 1000),
        active: true,
      },
      $setOnInsert: { cursor: 0, consentedAt: new Date() },
    },
    { upsert: true }
  );

  await schedulePoll(memberToken);
  logger.info({ memberToken, tenantId }, "consent captured");
  res.send(`Consent captured. Archiving scheduled for member ${memberToken}.`);
}
