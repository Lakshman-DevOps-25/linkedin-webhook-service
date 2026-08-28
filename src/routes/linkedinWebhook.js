const express = require("express");
const crypto = require("crypto");

const app = express();

app.get("/api/v1/linkedin/webhook", (req, res) => {
  const challengeCode = req.query.challengeCode;
  const applicationId = req.query.applicationId;

  console.log("LinkedIn validation request received");
  console.log("challengeCode:", challengeCode);
  console.log("applicationId:", applicationId || "none");
  console.log("has secret:", Boolean(config.linkedinClientSecret));

  if (!challengeCode) {
    return res.status(400).json({ error: "Missing challengeCode" });
  }

  if (!config.linkedinClientSecret) {
    return res.status(500).json({ error: "Missing LINKEDIN_CLIENT_SECRET" });
  }

  const challengeResponse = crypto
    .createHmac("sha256", config.linkedinClientSecret.trim())
    .update(challengeCode, "utf8")
    .digest("hex");

  console.log("challengeResponse:", challengeResponse);

  res.setHeader("Content-Type", "application/json");

  return res.status(200).json({
    challengeCode,
    challengeResponse
  });
});

app.post("/api/v1/linkedin/webhook", express.raw({ type: "*/*" }), (req, res) => {
  console.log("LinkedIn POST received");
  return res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.status(200).send("LinkedIn webhook service is running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
