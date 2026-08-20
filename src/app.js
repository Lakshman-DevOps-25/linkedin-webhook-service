const express = require("express");
const helmet = require("helmet");
const config = require("./config/env");

const app = express();

app.disable("x-powered-by");

app.use(helmet());

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
  require("./routes/health")
);

app.use(
  "/healthz",
  require("./routes/health")
);

app.use(
  config.webhookPath,
  require("./routes/linkedinWebhook")
);

app.use(
  require("./middleware/errorHandler")
);

module.exports = app;