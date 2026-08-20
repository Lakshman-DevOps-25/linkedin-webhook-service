const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      index: true
    },

    mediaId: {
      type: String,
      index: true,
      sparse: true
    },

    mediaType: {
      type: String
    },

    fileName: {
      type: String
    },

    mimeType: {
      type: String
    },

    url: {
      type: String
    },

    storageUrl: {
      type: String
    },

    sourceEvent: {
      type: mongoose.Schema.Types.Mixed
    },

    receivedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: "linkedin_media",
    timestamps: true
  }
);

module.exports = mongoose.model(
  "LinkedInMedia",
  schema
);