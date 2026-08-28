const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const { receiveWebhook } = require("../controllers/linkedinWebhookController");
const linkedinSignature = require("../middleware/linkedinSignature");

router.get("/", (req, res) => {
  const challengeCode = req.query.challengeCode;
  const applicationId = req.query.applicationId;

  console.log("LinkedIn validation request received");
  console.log("challengeCode:", challengeCode);
  console.log("applicationId:", applicationId || "none");
  console.log("has secret:", Boolean(config.linkedinClientSecret));

  if (!challengeCode) {
    return res.status(400).json({
      error: "Missing challengeCode"
    });
  }

  if (!config.linkedinClientSecret) {
    return res.status(500).json({
      error: "Missing LINKEDIN_CLIENT_SECRET"
    });
  }

  const challengeResponse = crypto
    .createHmac("sha256", config.linkedinClientSecret.trim())
    .update(challengeCode, "utf8")
    .digest("hex");

  console.log("challengeResponse:", challengeResponse);

  return res
    .status(200)
    .type("application/json")
    .json({
      challengeCode,
      challengeResponse
    });
});

router.post("/", linkedinSignature, receiveWebhook);

module.exports = router;
