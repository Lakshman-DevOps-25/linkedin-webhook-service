import pino from "pino";
import { createRequire } from "node:module";
import { config, isProd } from "./index.js";

const require = createRequire(import.meta.url);

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      "*.accessToken", "*.access_token", "*.refresh_token", "accessToken",
      "*.authorization", "req.headers.authorization",
      "req.headers['x-internal-signature']",
      "*.TOKEN_ENCRYPTION_KEY", "*.INTERNAL_WEBHOOK_SECRET",
      "*.LINKEDIN_CLIENT_SECRET", "*.AZURE_STORAGE_CONNECTION_STRING",
    ],
    censor: "[redacted]",
  },
  transport: isProd ? undefined : prettyTransport(),
});

// Return the pino-pretty transport in dev if installed; otherwise plain JSON logs.
function prettyTransport() {
  // logger is being constructed here, so use console directly.
  console.debug("prettyTransport: selecting dev log transport");
  try {
    require.resolve("pino-pretty");
    return { target: "pino-pretty", options: { colorize: true } };
  } catch {
    return undefined;
  }
}
