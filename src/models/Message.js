import mongoose from "mongoose";

const { Schema } = mongoose;

const MediaSchema = new Schema(
  {
    type: String,
    originalUrl: String,
    contentType: String,
    sizeBytes: Number,
    container: String,
    blobName: String,
    url: String,
    stored: { type: Boolean, default: false },
  },
  { _id: false }
);

const PartySchema = new Schema({ urn: String, name: String }, { _id: false });

const MessageSchema = new Schema(
  {
    messageId: { type: String, required: true, unique: true },
    conversationId: { type: String, required: true },
    tenantId: { type: String, required: true },
    source: { type: String, enum: ["changelog", "internal-webhook"], required: true },
    direction: { type: String, enum: ["inbound", "outbound", "unknown"], default: "unknown" },
    from: PartySchema,
    to: { type: [PartySchema], default: [] },
    body: { type: String, default: "" },
    media: { type: [MediaSchema], default: [] },
    occurredAt: { type: Date },
    capturedAt: { type: Date, required: true },
    activityStatus: { type: String, default: "NEW" },
    worm: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false }
);

// Indexes for efficient querying (messageId uniqueness declared field-level).
MessageSchema.index({ tenantId: 1, "from.urn": 1, capturedAt: -1 });
MessageSchema.index({ tenantId: 1, "to.urn": 1, capturedAt: -1 });
MessageSchema.index({ tenantId: 1, conversationId: 1, occurredAt: 1 });
MessageSchema.index({ tenantId: 1, capturedAt: -1 });
MessageSchema.index({ tenantId: 1, occurredAt: -1 });
MessageSchema.index({ body: "text" });

export const Message = mongoose.model("Message", MessageSchema, "messages");
