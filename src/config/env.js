const dotenv = require("dotenv");

dotenv.config();

const config = {
  nodeEnv: "production",

  port: Number(process.env.PORT || 5000),

  mongoUri:
    "mongodb+srv://lakshmana-gundala:Mongodb123@cluster0.mpkvh0j.mongodb.net/whatsapp_capture",

  linkedinClientId:
    "77vbq4hasjuc5b",

  linkedinClientSecret:
    "WPL_AP1.9e2I8qpSiN6XYkow.GuVJuA==",

  webhookPath:
    "/api/v1/linkedin/webhook",

  logLevel:
    "info",

  maxBodySize:
    "5mb"
};

module.exports = config;