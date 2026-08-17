/**
 * seed-token.js — local dev helper.
 *
 * Takes an access token minted from LinkedIn's OAuth Token Generator tool
 * (Member Data Portability "Member" product, scope r_dma_portability_self_serve)
 * and creates an encrypted MemberCursor so the poller runs against YOUR OWN
 * account without the 3rd-party review or the interactive OAuth callback.
 *
 * Usage:
 *   LINKEDIN_ACCESS_TOKEN=<token> npm run seed:token
 *   # optional: TENANT_ID=acme-fs
 *
 * Then start the worker (npm run worker) to begin archiving.
 * Note: message events only appear if your account is an EEA/Switzerland member.
 */
import crypto from "node:crypto";
import { connectMongo, disconnectMongo } from "../src/config/database.js";
import { MemberCursor } from "../src/models/index.js";
import { encrypt } from "../src/utils/crypto.js";
import { config } from "../src/config/index.js";

const token = process.env.LINKEDIN_ACCESS_TOKEN;
if (!token) {
  console.error("Set LINKEDIN_ACCESS_TOKEN to a self-serve token from the OAuth Token Generator.");
  process.exit(1);
}

const tenantId = process.env.TENANT_ID || config.DEFAULT_TENANT_ID;
const memberToken = crypto.createHash("sha256").update(token).digest("hex").slice(0, 24);

await connectMongo();
await MemberCursor.updateOne(
  { memberToken },
  {
    $set: { memberToken, tenantId, accessTokenEnc: encrypt(token), active: true },
    $setOnInsert: { cursor: 0, consentedAt: new Date() },
  },
  { upsert: true }
);
console.log(`Seeded MemberCursor ${memberToken} (tenant ${tenantId}). Start the worker to archive.`);
await disconnectMongo();
