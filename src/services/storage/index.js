import { config } from "../../config/index.js";
import { logger } from "../../config/logger.js";
import * as local from "./local.driver.js";
import * as azure from "./azure.driver.js";

/**
 * Storage facade. Picks the active media driver from STORAGE_DRIVER and exposes
 * a single, stable contract — initStorage() and archiveMedia() — so the rest of
 * the app never imports a concrete driver. Swapping local ⇄ azure is a config
 * change only.
 */
const driver = config.STORAGE_DRIVER === "azure" ? azure : local;

// Initialize the active storage backend (create dir/container). Call once at boot.
export function initStorage() {
  logger.debug({ driver: config.STORAGE_DRIVER }, "storage.initStorage: delegating to active driver");
  return driver.initStorage();
}

// Download and persist one media file via the active driver; returns its record.
export function archiveMedia(args) {
  logger.debug({ driver: config.STORAGE_DRIVER }, "storage.archiveMedia: delegating to active driver");
  return driver.archiveMedia(args);
}
