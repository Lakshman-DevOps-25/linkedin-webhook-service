import { z } from "zod";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";
import { persistEvent } from "../services/ingest.service.js";

const Envelope = z.object({
  tenantId: z.string().min(1).optional(),
  events: z.array(z.record(z.any())).min(1),
});

/**
 * Ingest events from an INTERNAL re-emitter. Signature/replay already verified
 * by middleware; req.parsedBody holds the JSON envelope.
 */
export async function ingest(req, res) {
  logger.debug("webhook.ingest: verified request received");
  const parsed = Envelope.safeParse(req.parsedBody);
  if (!parsed.success) return res.status(400).json({ error: "invalid payload", issues: parsed.error.issues });

  const tenantId = parsed.data.tenantId || config.DEFAULT_TENANT_ID;
  const results = { ingested: 0, duplicate: 0, skipped: 0 };

  for (const evt of parsed.data.events) {
    try {
      const r = await persistEvent(evt, { source: "internal-webhook", tenantId });
      results[r]++;
    } catch (err) {
      logger.error({ err: err.message }, "internal webhook event failed");
    }
  }

  logger.info(results, "internal webhook processed");
  res.status(202).json({ accepted: true, ...results });
}
