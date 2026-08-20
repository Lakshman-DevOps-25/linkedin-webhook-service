const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "linkedin-webhook-connector",
    status: "UP",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;