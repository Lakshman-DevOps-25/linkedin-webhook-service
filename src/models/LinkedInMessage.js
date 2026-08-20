const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      index: true
    },

    messageId: {
      type: String,
      index: true,
      sparse: true
    },

    conversationId: {
      type: String,
      index: true,
      sparse: true
    },

    sender: {
      type: mongoose.Schema.Types.Mixed
    },

    recipient: {
      type: mongoose.Schema.Types.Mixed
    },

    message: {
      type: String
    },

    messageType: {
      type: String
    },

    direction: {
      type: String,
      enum: [
        "INBOUND",
        "OUTBOUND",
        "UNKNOWN"
      ],
      default: "UNKNOWN"
    },

    media: {
      type: mongoose.Schema.Types.Mixed
    },

    event: {
      type: mongoose.Schema.Types.Mixed
    },

    receivedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: "linkedin_messages",
    timestamps: true
  }
);

module.exports = mongoose.model(
  "LinkedInMessage",
  schema
);