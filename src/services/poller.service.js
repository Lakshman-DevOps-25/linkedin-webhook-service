import { MemberCursor } from "../models/index.js";
import { fetchChangelogPage } from "./linkedin/changelog.service.js";
import { persistEvent } from "./ingest.service.js";
import { decrypt } from "../utils/crypto.js";
import { logger } from "../config/logger.js";

/** Drain all available changelog pages for one member, advancing the cursor. */
export async function pollMember(memberToken) {
  const rec = await MemberCursor.findOne({ memberToken, active: true });
  if (!rec) return { ingested: 0, duplicate: 0, skipped: 0 };

  const accessToken = decrypt(rec.accessTokenEnc);
  let start = rec.cursor || 0;
  let ingested = 0, duplicate = 0, skipped = 0, pages = 0;

  for (;;) {
    const { elements, nextStart } = await fetchChangelogPage({ accessToken, start });
    for (const evt of elements) {
      const r = await persistEvent(evt, {
        source: "changelog",
        tenantId: rec.tenantId,
        memberToken,
        bearer: accessToken,
      });
      if (r === "ingested") ingested++;
      else if (r === "duplicate") duplicate++;
      else skipped++;
    }
    pages++;
    if (nextStart == null) { start += elements.length; break; }
    start = nextStart;
    if (pages > 200) { logger.warn({ memberToken }, "page cap hit; resume next run"); break; }
  }

  await MemberCursor.updateOne({ memberToken }, { $set: { cursor: start, lastPolledAt: new Date() } });
  logger.info({ memberToken, ingested, duplicate, skipped, pages }, "poll complete");
  return { ingested, duplicate, skipped };
}
