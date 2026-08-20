const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      index: true
    },

    postId: {
      type: String,
      index: true,
      sparse: true
    },

    author: {
      type: mongoose.Schema.Types.Mixed
    },

    organization: {
      type: mongoose.Schema.Types.Mixed
    },

    text: {
      type: String
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
    collection: "linkedin_posts",
    timestamps: true
  }
);

module.exports = mongoose.model(
  "LinkedInPost",
  schema
);