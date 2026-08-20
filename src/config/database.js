import mongoose from "mongoose";
import { config } from "./index.js";
import { logger } from "./logger.js";

// Connect Mongoose to MongoDB and log connection errors. Call once at boot.
export async function connectMongo() {
  logger.debug({ db: config.MONGO_DB }, "connectMongo: connecting");
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.MONGO_URL, { dbName: config.MONGO_DB });
  logger.info({ db: config.MONGO_DB }, "mongo connected");
  mongoose.connection.on("error", (err) => logger.error({ err: err.message }, "mongo error"));
  return mongoose.connection;
}

// Close the Mongoose connection (used for graceful shutdown and scripts).
export async function disconnectMongo() {
  logger.debug("disconnectMongo: closing connection");
  await mongoose.disconnect();
}
