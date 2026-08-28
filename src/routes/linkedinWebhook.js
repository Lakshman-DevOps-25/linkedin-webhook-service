const express = require("express");

const router = express.Router();

const {
  validateWebhook,
  receiveWebhook
} = require("../controllers/linkedinWebhookController");

const linkedinSignature =
  require("../middleware/linkedinSignature");

router.get(
  "/",
  validateWebhook
);

router.post(
  "/",
  linkedinSignature,
  receiveWebhook
);

module.exports = router;
