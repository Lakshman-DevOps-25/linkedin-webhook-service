import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../../config/index.js";
import { logger } from "../../config/logger.js";
import { withBackoff, HttpError } from "../../utils/backoff.js";

/**
 * LOCAL filesystem media driver (development).
 *
 * Implements the same contract as the Azure driver so the two are
 * interchangeable via STORAGE_DRIVER. Files are written under:
 *   {LOCAL_STORAGE_DIR}/{MEDIA_CONTAINER}/{tenantId}/{conversationId}/{messageId}/{filename}
 * and the stored `url` points at the app's static /media route so links are
 * browsable in dev. To move to Azure later, just set STORAGE_DRIVER=azure —
 * no calling code changes.
 */

// Resolve the driver's absolute root: {LOCAL_STORAGE_DIR}/{MEDIA_CONTAINER}.
function rootDir() {
  logger.debug("local.rootDir: resolving storage root");
  return path.resolve(config.LOCAL_STORAGE_DIR, config.MEDIA_CONTAINER);
}

// Ensure the storage root exists; called once at boot.
export async function initStorage() {
  logger.debug("local.initStorage: ensuring storage dir");
  await fs.mkdir(rootDir(), { recursive: true });
  logger.info({ dir: rootDir(), driver: "local" }, "local media storage ready");
}

// Sanitize a candidate filename so it can't traverse or contain unsafe chars.
function safeName(s) {
  logger.debug({ s }, "local.safeName: sanitizing filename");
  return String(s || "file").replace(/[^\w.\-]+/g, "_").slice(0, 200);
}

// Coarsely classify a MIME type into a media category for the UI/records.
function guessType(contentType = "") {
  logger.debug({ contentType }, "local.guessType: classifying media");
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.includes("pdf") || contentType.includes("msword") || contentType.includes("officedocument"))
    return "document";
  return "other";
}

/**
 * Download a media URL and write it to the local filesystem (write-once).
 * Returns the media reference persisted alongside the message in Mongo.
 * @param {{url:string,tenantId:string,conversationId:string,messageId:string,filename?:string,bearer?:string}} p
 * @returns {Promise<object>}
 */
export async function archiveMedia({ url, tenantId, conversationId, messageId, filename, bearer }) {
  logger.debug({ url, tenantId, conversationId, messageId }, "local.archiveMedia: begin");
  // Fetch the source bytes with retry/backoff (network + 429/5xx are retryable).
  const fetchBlob = async () => {
    const res = await fetch(url, { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} });
    if (!res.ok) {
      const retryAfter = Number(res.headers.get("retry-after")) * 1000 || null;
      throw new HttpError(res.status, `media fetch ${res.status}`, retryAfter);
    }
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const buf = Buffer.from(await res.arrayBuffer());
    return { buf, contentType };
  };

  const { buf, contentType } = await withBackoff(fetchBlob, { label: "media-fetch" });

  const name = safeName(filename || url.split("/").pop()?.split("?")[0]);
  const relPath = path.join(tenantId, conversationId, messageId, name);
  const absPath = path.join(rootDir(), relPath);

  // Create the nested directory, then write the file only if absent (write-once).
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  try {
    await fs.writeFile(absPath, buf, { flag: "wx" }); // wx = fail if exists
    logger.info({ path: relPath, bytes: buf.length }, "media stored (local)");
  } catch (err) {
    // EEXIST => already archived; treat as idempotent success, not an error.
    if (err.code === "EEXIST") logger.debug({ path: relPath }, "media already present (idempotent)");
    else throw err;
  }

  // Build a browsable URL served by the app's static /media mount.
  const publicUrl = `${config.PUBLIC_BASE_URL}/media/${encodeURI(relPath.split(path.sep).join("/"))}`;

  return {
    type: guessType(contentType),
    originalUrl: url,
    contentType,
    sizeBytes: buf.length,
    container: config.MEDIA_CONTAINER,
    blobName: relPath.split(path.sep).join("/"),
    url: publicUrl,
    stored: true,
  };
}
