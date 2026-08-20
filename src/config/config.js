const config = {
  MONGO_URL:
    "mongodb+srv://lakshmana-gundala:Mongodb123@cluster0.mpkvh0j.mongodb.net/whatsapp_capture?retryWrites=true&w=majority",

  INTERNAL_WEBHOOK_SECRET:
    "4c148f370a32d335e0524238851eff2a207274e2716f821d",

  LINKEDIN_CLIENT_ID:
    "77vbq4hasjuc5b",

  LINKEDIN_CLIENT_SECRET:
    "WPL_AP1.9e2I8qpSiN6XYkow.GuVJuA==",

  PORT:
    process.env.PORT || 5000,

  LINKEDIN_WEBHOOK_PATH:
    "/api/v1/linkedin/webhook"
};

module.exports = config;