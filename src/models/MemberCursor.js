import mongoose from "mongoose";

const { Schema } = mongoose;

/** Per consenting member: encrypted access token + changelog cursor. */
const MemberCursorSchema = new Schema(
  {
    memberToken: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    accessTokenEnc: { type: String, required: true }, // AES-256-GCM, never plaintext
    tokenExpiresAt: { type: Date },
    cursor: { type: Number, default: 0 },
    lastPolledAt: { type: Date },
    consentedAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MemberCursor = mongoose.model("MemberCursor", MemberCursorSchema, "member_cursors");
