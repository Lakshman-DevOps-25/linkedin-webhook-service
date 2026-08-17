/**
 * View layer — shapes model documents into API responses. Keeps controllers
 * free of presentation concerns and prevents internal fields from leaking.
 */
export function serializeMessage(doc) {
  return {
    messageId: doc.messageId,
    conversationId: doc.conversationId,
    direction: doc.direction,
    from: doc.from ? { urn: doc.from.urn, name: doc.from.name } : null,
    to: (doc.to || []).map((t) => ({ urn: t.urn, name: t.name })),
    body: doc.body,
    media: (doc.media || []).map((m) => ({
      type: m.type,
      url: m.url || null, // durable Azure blob URL
      contentType: m.contentType,
      sizeBytes: m.sizeBytes,
      stored: !!m.stored,
    })),
    occurredAt: doc.occurredAt,
    capturedAt: doc.capturedAt,
    activityStatus: doc.activityStatus,
    worm: doc.worm,
    source: doc.source,
  };
}

// Serialize a paginated list of messages for an API list response.
export function serializeMessageList({ total, records }) {
  return {
    total,
    count: records.length,
    records: records.map(serializeMessage),
  };
}
