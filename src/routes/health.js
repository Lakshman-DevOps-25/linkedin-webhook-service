const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  console.log(`[HEALTH] ${new Date().toISOString()}`);
  
  res.status(200).json({
    success: true,
    service: "linkedin-webhook-connector",
    status: "UP",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;