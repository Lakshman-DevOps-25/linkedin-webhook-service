import "dotenv/config";
import { z } from "zod";

// Environment schema for the webhook-only archiving service. Validated once at
// boot so the process fails fast on misconfiguration.
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    // Absolute base URL used to build browsable media links (local driver).
    PUBLIC_BASE_URL: z.string().url().default("http://localhost:4000"),

    // --- MongoDB ---
    // App client secret (from the Auth tab) 2014 used to answer LinkedIn's webhook challenge
    // and to verify signed event POSTs. Required only for the LinkedIn webhook route.
    LINKEDIN_CLIENT_SECRET: z.string().optional(),

    MONGO_URL: z.string().min(1),
    MONGO_DB: z.string().default("linkedin_archive"),

    // --- Media storage (pluggable local ⇄ azure) ---
    STORAGE_DRIVER: z.enum(["local", "azure"]).default("local"),
    MEDIA_CONTAINER: z.string().default("li-archive-media"),
    LOCAL_STORAGE_DIR: z.string().default("./storage"),
    AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),

    // --- Internal webhook security (this is YOUR secret; LinkedIn is not involved) ---
    INTERNAL_WEBHOOK_SECRET: z.string().min(16),
    INTERNAL_WEBHOOK_MAX_SKEW_MS: z.coerce.number().int().positive().default(300000),

    DEFAULT_TENANT_ID: z.string().default("default"),
  })
  // Azure connection string is mandatory only when the Azure driver is selected.
  .superRefine((cfg, ctx) => {
    if (cfg.STORAGE_DRIVER === "azure" && !cfg.AZURE_STORAGE_CONNECTION_STRING) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AZURE_STORAGE_CONNECTION_STRING"],
        message: "required when STORAGE_DRIVER=azure",
      });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const fields = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  console.error("Invalid configuration:\n  " + fields.join("\n  "));
  process.exit(1);
}

export const config = parsed.data;
export const isProd = config.NODE_ENV === "production";
