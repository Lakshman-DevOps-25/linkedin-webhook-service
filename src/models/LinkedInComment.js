const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      index: true
    },

    commentId: {
      type: String,
      index: true,
      sparse: true
    },

    postId: {
      type: String,
      index: true,
      sparse: true
    },

    author: {
      type: mongoose.Schema.Types.Mixed
    },

    text: {
      type: String
    },

    parentCommentId: {
      type: String
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
    collection: "linkedin_comments",
    timestamps: true
  }
);

module.exports = mongoose.model(
  "LinkedInComment",
  schema
);