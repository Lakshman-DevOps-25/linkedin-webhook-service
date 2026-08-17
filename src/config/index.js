import "dotenv/config";
import { z } from "zod";

// Environment schema. Validated once at boot so the process fails fast and
// loudly on misconfiguration rather than throwing deep in a request later.
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    // Absolute base URL used to build browsable media links (esp. for local driver).
    PUBLIC_BASE_URL: z.string().url().default("http://localhost:4000"),

    LINKEDIN_CLIENT_ID: z.string().min(1),
    LINKEDIN_CLIENT_SECRET: z.string().min(1),
    LINKEDIN_REDIRECT_URI: z.string().url(),
    LINKEDIN_SCOPE: z.string().default("r_dma_portability_3rd_party"),
    LINKEDIN_API_VERSION: z.string().regex(/^\d{6}$/).default("202312"),

    CHANGELOG_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(900000),
    CHANGELOG_PAGE_SIZE: z.coerce.number().int().positive().max(50).default(50),

    MONGO_URL: z.string().min(1),
    MONGO_DB: z.string().default("linkedin_archive"),
    REDIS_URL: z.string().min(1),

    // --- Media storage (pluggable) ---
    // 'local' writes to the filesystem for development; 'azure' uses Blob Storage.
    // Switch drivers by changing this one value — no code changes required.
    STORAGE_DRIVER: z.enum(["local", "azure"]).default("local"),
    // Logical container/bucket name; used as the Azure container and as the
    // top-level subdirectory for the local driver.
    MEDIA_CONTAINER: z.string().default("li-archive-media"),
    // Local driver: root directory that media is written under.
    LOCAL_STORAGE_DIR: z.string().default("./storage"),
    // Azure driver: required only when STORAGE_DRIVER=azure (enforced below).
    AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),

    TOKEN_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "must be 64 hex chars (32 bytes)"),
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
  // Print field names + messages only — never the offending values.
  const fields = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  console.error("Invalid configuration:\n  " + fields.join("\n  "));
  process.exit(1);
}

export const config = parsed.data;
export const isProd = config.NODE_ENV === "production";
