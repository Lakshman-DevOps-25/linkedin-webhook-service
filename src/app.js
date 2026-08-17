import express from "express";
import helmet from "helmet";
import path from "node:path";
import pinoHttp from "pino-http";
import { config } from "./config/index.js";
import { logger } from "./config/logger.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

/**
 * Build the Express app (transport-agnostic; no port binding here).
 * When the local storage driver is active, archived media is served statically
 * at /media so the URLs stored in Mongo are browsable in development. Under the
 * Azure driver this mount is skipped (blob URLs are served by Azure).
 */
export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(pinoHttp({ logger }));

  // Serve locally-stored media in development only.
  if (config.STORAGE_DRIVER === "local") {
    const mediaRoot = path.resolve(config.LOCAL_STORAGE_DIR, config.MEDIA_CONTAINER);
    app.use("/media", express.static(mediaRoot));
  }

  // NOTE: no global express.json() — the internal webhook needs the raw body for
  // signature verification and parses JSON itself. Add express.json() on
  // specific future routes that need it.
  app.use(routes);

  app.use(errorHandler);
  return app;
}
