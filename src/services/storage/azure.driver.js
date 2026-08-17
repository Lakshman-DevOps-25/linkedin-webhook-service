import { BlobServiceClient } from "@azure/storage-blob";
import { config } from "../../config/index.js";
import { logger } from "../../config/logger.js";
import { withBackoff, HttpError } from "../../utils/backoff.js";

/**
 * AZURE Blob media driver (production).
 *
 * Implements the same contract as the local driver. Blobs are pathed as
 *   {tenantId}/{conversationId}/{messageId}/{filename}
 * within MEDIA_CONTAINER, and uploaded with If-None-Match:* so each blob is
 * written exactly once (WORM-aligned).
 */
let container;

// Connect to the account and ensure the container exists; called once at boot.
export async function initStorage() {
  const svc = BlobServiceClient.fromConnectionString(config.AZURE_STORAGE_CONNECTION_STRING);
  container = svc.getContainerClient(config.MEDIA_CONTAINER);
  await container.createIfNotExists();
  logger.info({ container: config.MEDIA_CONTAINER, driver: "azure" }, "azure media storage ready");
}

// Sanitize a candidate filename so it can't contain unsafe characters.
function safeName(s) {
  return String(s || "file").replace(/[^\w.\-]+/g, "_").slice(0, 200);
}

// Coarsely classify a MIME type into a media category for the UI/records.
function guessType(contentType = "") {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.includes("pdf") || contentType.includes("msword") || contentType.includes("officedocument"))
    return "document";
  return "other";
}

/**
 * Download a media URL and upload it to Azure Blob (write-once).
 * Returns the media reference persisted alongside the message in Mongo.
 * @param {{url:string,tenantId:string,conversationId:string,messageId:string,filename?:string,bearer?:string}} p
 * @returns {Promise<object>}
 */
export async function archiveMedia({ url, tenantId, conversationId, messageId, filename, bearer }) {
  if (!container) throw new Error("azure storage not initialized");

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
  const blobName = `${tenantId}/${conversationId}/${messageId}/${name}`;
  const block = container.getBlockBlobClient(blobName);

  // Upload once; a pre-existing blob (409/412) is an idempotent no-op.
  try {
    await block.uploadData(buf, {
      blobHTTPHeaders: { blobContentType: contentType },
      conditions: { ifNoneMatch: "*" },
    });
    logger.info({ blobName, bytes: buf.length }, "media stored (azure)");
  } catch (err) {
    if (err.statusCode === 409 || err.statusCode === 412) {
      logger.debug({ blobName }, "media already present (idempotent)");
    } else {
      throw err;
    }
  }

  return {
    type: guessType(contentType),
    originalUrl: url,
    contentType,
    sizeBytes: buf.length,
    container: config.MEDIA_CONTAINER,
    blobName,
    url: block.url,
    stored: true,
  };
}
