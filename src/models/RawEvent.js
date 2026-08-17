import mongoose from "mongoose";
import { logger } from "../config/logger.js";

const { Schema } = mongoose;

/** BRONZE — immutable raw capture. Write-once; unique activityId = dedup. */
const RawEventSchema = new Schema(
  {
    activityId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    source: { type: String, enum: ["internal-webhook"], default: "internal-webhook", required: true },
    memberToken: { type: String, index: true },
    raw: { type: Schema.Types.Mixed, required: true },
    capturedAt: { type: Date, required: true, default: Date.now },
  },
  { minimize: false }
);

// Enforce bronze immutability: reject any attempt to update a raw event.
RawEventSchema.pre("findOneAndUpdate", function () {
  logger.debug("RawEvent.findOneAndUpdate blocked: bronze is immutable");
  throw new Error("bronze raw_events is immutable; updates are not permitted");
});

export const RawEvent = mongoose.model("RawEvent", RawEventSchema, "raw_events");
