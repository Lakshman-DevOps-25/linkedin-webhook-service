const express = require("express");
const helmet = require("helmet");

const config = require("./config/env");

const linkedinWebhookRoutes =
  require("./routes/linkedinWebhook");

const healthRoutes =
  require("./routes/health");

const errorHandler =
  require("./middleware/errorHandler");

const app = express();

app.disable("x-powered-by");

app.use(helmet());

/*
 * IMPORTANT:
 *
 * Capture the raw request body.
 * LinkedIn signature validation requires
 * the exact JSON bytes received.
 */
app.use(
  express.json({
    limit: config.maxBodySize,

    verify: (req, res, buffer) => {
      req.rawBody = buffer.toString("utf8");
    }
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  "/health",
  healthRoutes
);

app.use(
  config.webhookPath,
  linkedinWebhookRoutes
);

app.use(errorHandler);

module.exports = app;