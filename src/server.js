const mongoose = require("mongoose");

const app = require("./app");

const config = require("./config/env");

const logger =
  require("./utils/logger");


async function startServer() {
  try {

    logger.info(
      "Connecting to MongoDB..."
    );

    await mongoose.connect(
      config.mongoUri,
      {
        serverSelectionTimeoutMS: 10000
      }
    );

    logger.info(
      "MongoDB connected"
    );

    const server =
      app.listen(
        config.port,
        "0.0.0.0",
        () => {
          logger.info(
            `LinkedIn connector running on port ${config.port}`
          );
        }
      );

    /*
     * Graceful shutdown
     */
    const shutdown =
      async (signal) => {
        logger.info(
          `${signal} received. Shutting down...`
        );

        server.close(
          async () => {
            await mongoose.connection.close(
              false
            );

            logger.info(
              "MongoDB connection closed"
            );

            process.exit(0);
          }
        );
      };

    process.on(
      "SIGTERM",
      () => shutdown("SIGTERM")
    );

    process.on(
      "SIGINT",
      () => shutdown("SIGINT")
    );

  } catch (error) {

    logger.error({
      message:
        "Failed to start server",
      error: error.message
    });

    process.exit(1);
  }
}


startServer();