const mongoose = require("mongoose");

const LinkedInWebhookEventSchema =
  new mongoose.Schema(
    {
      notificationId: {
        type: String,
        required: true,
        unique: true,
        index: true
      },

      eventType: {
        type: String,
        default: "UNKNOWN",
        index: true
      },

      actor: {
        type: mongoose.Schema.Types.Mixed
      },

      organization: {
        type: mongoose.Schema.Types.Mixed
      },

      eventTime: {
        type: Date
      },

      rawBody: {
        type: String,
        required: true
      },

      payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      },

      headers: {
        type: mongoose.Schema.Types.Mixed
      },

      processingStatus: {
        type: String,
        enum: [
          "RECEIVED",
          "PROCESSED",
          "FAILED"
        ],
        default: "RECEIVED",
        index: true
      },

      processingError: {
        type: String
      },

      receivedAt: {
        type: Date,
        default: Date.now,
        index: true
      },

      processedAt: {
        type: Date
      }
    },
    {
      collection: "linkedin_webhook_events",
      timestamps: true
    }
  );

module.exports = mongoose.model(
  "LinkedInWebhookEvent",
  LinkedInWebhookEventSchema
);