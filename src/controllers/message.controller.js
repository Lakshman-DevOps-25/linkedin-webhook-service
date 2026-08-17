import { z } from "zod";
import { config } from "../config/index.js";
import { Message } from "../models/index.js";
import { serializeMessageList } from "../views/message.view.js";

export const messageQuerySchema = z.object({
  tenantId: z.string().default(config.DEFAULT_TENANT_ID),
  from: z.string().optional(),
  to: z.string().optional(),
  conversationId: z.string().optional(),
  q: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

// List archived messages for a tenant with optional sender/recipient/date/text filters.
export async function list(req, res) {
  const { tenantId, from, to, conversationId, q, fromDate, toDate, limit, skip } = req.query;

  const filter = { tenantId };
  if (from) filter["from.urn"] = from;
  if (to) filter["to.urn"] = to;
  if (conversationId) filter.conversationId = conversationId;
  if (q) filter.$text = { $search: q };
  if (fromDate || toDate) {
    filter.capturedAt = {};
    if (fromDate) filter.capturedAt.$gte = fromDate;
    if (toDate) filter.capturedAt.$lte = toDate;
  }

  const [records, total] = await Promise.all([
    Message.find(filter).sort({ capturedAt: -1 }).skip(skip).limit(limit).lean(),
    Message.countDocuments(filter),
  ]);

  res.json(serializeMessageList({ total, records }));
}
