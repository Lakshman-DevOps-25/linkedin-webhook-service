const dotenv = require("dotenv");

dotenv.config();

const config = {
  // ==========================================
  // APPLICATION
  // ==========================================

  nodeEnv: "production",

  // Render supplies PORT.
  // Local development defaults to 5000.
  port: Number(process.env.PORT || 5000),

  // ==========================================
  // MONGODB
  // ==========================================

  mongoUri:
    "mongodb+srv://lakshmana-gundala:Mongodb123@cluster0.mpkvh0j.mongodb.net/whatsapp_capture?retryWrites=true&w=majority",

  // ==========================================
  // LINKEDIN
  // ==========================================

  linkedinClientId:
    "77vbq4hasjuc5b",

  linkedinClientSecret:
    "WPL_AP1.9e2I8qpSiN6XYkow.GuVJuA==",

  // ==========================================
  // WEBHOOK
  // ==========================================

  webhookPath:
    "/api/v1/linkedin/webhook",

  // ==========================================
  // LOGGING
  // ==========================================

  logLevel:
    "info",

  // ==========================================
  // REQUEST LIMIT
  // ==========================================

  maxBodySize:
    "5mb"
};

module.exports = config;