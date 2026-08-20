import express from "express";
import helmet from "helmet";
import path from "node:path";
import pinoHttp from "pino-http";
import { config } from "./config/index.js";
import { logger } from "./config/logger.js";
import routes from "./routes/index.js";
import linkedinWebhookRoutes from "./routes/linkedinWebhook.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

/**
 * Build the Express app (transport-agnostic; no port binding here).
 * The LinkedIn webhook route is mounted FIRST, before helmet/logging, because
 * its challenge must return within LinkedIn's 3-second deadline — we keep that
 * path as lightweight as possible and free of extra headers.
 */
export function createApp() {
  logger.debug({ driver: config.STORAGE_DRIVER }, "createApp: assembling express app");
  const app = express();

  // Fast path: LinkedIn challenge/validation (no helmet, no heavy logging).
  app.use("/linkedin", linkedinWebhookRoutes);

  app.use(helmet());
  app.use(pinoHttp({ logger }));

  // Serve locally-stored media in development only.
  if (config.STORAGE_DRIVER === "local") {
    const mediaRoot = path.resolve(config.LOCAL_STORAGE_DIR, config.MEDIA_CONTAINER);
    app.use("/media", express.static(mediaRoot));
  }

  // Everything else (health, internal webhook, read-back API).
  app.use(routes);

  app.use(errorHandler);
  return app;
}
