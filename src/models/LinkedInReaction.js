const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      index: true
    },

    reactionId: {
      type: String,
      index: true,
      sparse: true
    },

    postId: {
      type: String,
      index: true,
      sparse: true
    },

    actor: {
      type: mongoose.Schema.Types.Mixed
    },

    reactionType: {
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
    collection: "linkedin_reactions",
    timestamps: true
  }
);

module.exports = mongoose.model(
  "LinkedInReaction",
  schema
);