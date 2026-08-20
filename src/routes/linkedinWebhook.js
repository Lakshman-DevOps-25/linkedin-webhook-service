const express = require("express");

const router = express.Router();

const {
  validateWebhook,
  receiveWebhook
} = require(
  "../controllers/linkedinWebhookController"
);

const linkedinSignature =
  require("../middleware/linkedinSignature");


/*
 * LinkedIn webhook ownership validation.
 *
 * GET /api/v1/linkedin/webhook
 */
router.get(
  "/",
  validateWebhook
);


/*
 * LinkedIn event notification.
 *
 * POST /api/v1/linkedin/webhook
 */
router.post(
  "/",
  linkedinSignature,
  receiveWebhook
);

module.exports = router;