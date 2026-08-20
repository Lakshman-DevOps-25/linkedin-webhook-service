import { RawEvent, Message } from "../models/index.js";
import { archiveMedia } from "./storage/index.js";
import { logger } from "../config/logger.js";

// Decide whether a changelog/webhook event concerns messaging (defensive across API versions).
export function isMessageEvent(evt) {
  logger.debug({ id: evt && (evt.id || evt.activityId) }, "isMessageEvent: classifying event");
  const name = (evt.resourceName || evt.resource || evt.method || "").toString().toLowerCase();
  return name.includes("message") || name.includes("conversation") || name.includes("messaging");
}

// Map a raw event into the silver Message shape; media is ALWAYS an array.
export function normalizeMessageEvent(evt, { source, tenantId }) {
  logger.debug({ id: evt && (evt.id || evt.activityId), source }, "normalizeMessageEvent: mapping to silver record");
  const p = evt.processedActivity || evt.activity || evt.payload || {};
  const rawMedia = p.attachments ?? p.media ?? [];
  const mediaArr = Array.isArray(rawMedia) ? rawMedia : rawMedia ? [rawMedia] : [];

  return {
    messageId: evt.id || evt.activityId,
    conversationId: String(p.conversationUrn || p.conversationId || "unknown"),
    tenantId,
    source,
    direction: p.direction || "unknown",
    from: p.from || p.author || null,
    to: Array.isArray(p.recipients) ? p.recipients : p.to ? [].concat(p.to) : [],
    body: p.body || p.text || p.message || "",
    media: mediaArr.map((m) => ({
      type: m.type || "other",
      originalUrl: m.url || m.downloadUrl || m.href,
      contentType: m.contentType,
      sizeBytes: m.sizeBytes,
      stored: false,
    })),
    occurredAt: p.createdAt ? new Date(p.createdAt) : null,
    capturedAt: new Date(evt.capturedAt || evt.processedAt || Date.now()),
    activityStatus: evt.activityStatus || "NEW",
    worm: true,
  };
}

/**
 * Persist one event idempotently: bronze (write-once) + media + silver (upsert).
 * @returns {'ingested'|'duplicate'|'skipped'}
 */
export async function persistEvent(evt, { source, tenantId, memberToken = null, bearer = null }) {
  logger.debug({ source, tenantId }, "persistEvent: begin");
  if (!isMessageEvent(evt)) return "skipped";
  const activityId = evt.id || evt.activityId;
  if (!activityId) {
    logger.warn({ source }, "event missing activityId; skipping");
    return "skipped";
  }

  let isNew = true;
  try {
    await RawEvent.create({ activityId, tenantId, source, memberToken, raw: evt, capturedAt: new Date() });
  } catch (err) {
    if (err.code === 11000) isNew = false;
    else throw err;
  }

  const doc = normalizeMessageEvent(evt, { source, tenantId });

  for (const m of doc.media) {
    if (!m.originalUrl) continue;
    try {
      const ref = await archiveMedia({
        url: m.originalUrl,
        tenantId,
        conversationId: doc.conversationId,
        messageId: doc.messageId,
        bearer,
      });
      Object.assign(m, ref);
    } catch (err) {
      logger.error({ err: err.message, messageId: doc.messageId }, "media archive failed; metadata only");
    }
  }

  await Message.updateOne({ messageId: doc.messageId }, { $set: doc }, { upsert: true });
  return isNew ? "ingested" : "duplicate";
}
