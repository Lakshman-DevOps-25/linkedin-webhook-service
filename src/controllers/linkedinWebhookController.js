const crypto = require("crypto");

const config = require("../config/env");

const LinkedInWebhookEvent = require("../models/LinkedInWebhookEvent");

const { processLinkedInEvent } = require("../services/linkedinEventProcessor");

/*
exports.validateWebhook = (req, res) => {
  try {
    console.log("========================================");
    console.log("LINKEDIN WEBHOOK VALIDATION");
    console.log("========================================");
    console.log("Query:", req.query);

    const challengeCode = req.query.challengeCode;

    if (!challengeCode) {
      console.error("Missing challengeCode");

      return res.status(400).json({
        error: "challengeCode is required"
      });
    }

    // LinkedIn should send exactly one challengeCode.
    if (Array.isArray(challengeCode)) {
      console.error("Multiple challengeCode values:", challengeCode);

      return res.status(400).json({
        error: "Invalid challengeCode"
      });
    }

    if (!config.linkedinClientSecret) {
      console.error("LinkedIn Client Secret is missing");

      return res.status(500).json({
        error: "LinkedIn Client Secret is not configured"
      });
    }

    // const challengeResponse = crypto
    //   .createHmac(
    //     "sha256",
    //     config.linkedinClientSecret
    //   )
    //   .update(challengeCode, "utf8")
    //   .digest("hex");

    const challengeResponse = crypto
      .createHmac("sha256", config.linkedinClientSecret)
      .update(challengeCode)
      .digest("hex");

    console.log("challengeCode:", challengeCode);
    console.log(
      "challengeResponse:",
      challengeResponse
    );
    console.log(
      "challengeResponse length:",
      challengeResponse.length
    );

    console.log("========================================");

    // return res
    //   .status(200)
    //   .type("application/json")
    //   .send(
    //     JSON.stringify({
    //       challengeCode,
    //       challengeResponse
    //     })
    //   );

    return res.status(200).json({
        challengeCode,
        challengeResponse
      });

  } catch (error) {
    console.error(
      "LinkedIn webhook validation error:",
      error
    );

    return res.status(500).json({
      error: "Webhook validation failed"
    });
  }
};
*/

exports.validateWebhook = (req, res) => {
  try {
    console.log("========================================");
    console.log("LINKEDIN WEBHOOK VALIDATION");
    console.log("========================================");
    console.log("Query:", req.query);

    let challengeCode = req.query.challengeCode;

    if (!challengeCode) {
      console.error("Missing challengeCode");
      return res.status(400).json({
        error: "challengeCode is required"
      });
    }

    // FIX: Instead of throwing an error, handle the array gracefully
    if (Array.isArray(challengeCode)) {
      console.warn("Multiple challengeCode values received:", challengeCode);

      // Extract the element that matches a UUID format (8-4-4-4-12 hex chars)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const realCode = challengeCode.find(code => uuidRegex.test(code));

      // Use the matched UUID string, or fallback to the last item if none matches
      challengeCode = realCode || challengeCode[challengeCode.length - 1];
      console.log("Extracted true challengeCode string:", challengeCode);
    }

    if (!config.linkedinClientSecret) {
      console.error("LinkedIn Client Secret is missing");
      return res.status(500).json({
        error: "LinkedIn Client Secret is not configured"
      });
    }

    const challengeResponse = crypto
      .createHmac(
        "sha256",
        config.linkedinClientSecret
      )
      .update(challengeCode, "utf8")
      .digest("hex");

    console.log("challengeCode:", challengeCode);
    console.log("challengeResponse:", challengeResponse);
    console.log("challengeResponse length:", challengeResponse.length);
    console.log("========================================");

    console.log("C_Code and C_Response: ", {
      challengeCode,
      challengeResponse
    });
    
    // Express res.json() handles content-type and JSON stringification automatically
    return res.status(200).json({
      challengeCode,
      challengeResponse
    });

  } catch (error) {
    console.error("LinkedIn webhook validation error:", error);
    return res.status(500).json({
      error: "Webhook validation failed"
    });
  }
};

exports.receiveWebhook = async (req, res) => {
  try {
    const payload = req.body;

    if (!payload) {
      return res.status(400).json({
        success: false,
        message: "Empty webhook payload"
      });
    }

    /*
     * LinkedIn notification ID.
     *
     * Depending on the LinkedIn product/event,
     * the notification identifier can appear in
     * different locations.
     */
    const notificationId =
      payload.notificationId ||
      payload.id ||
      payload.event?.notificationId ||
      payload.event?.id;

    if (!notificationId) {
      /*
       * Do not silently manufacture an ID from the
       * JSON because LinkedIn specifically expects
       * notification IDs to be used for deduplication.
       */
      return res.status(400).json({
        success: false,
        message:
          "LinkedIn notification ID not found"
      });
    }

    const eventType =
      payload.eventType ||
      payload.type ||
      payload.event?.type ||
      payload.event?.eventType ||
      "UNKNOWN";

    /*
     * Fast duplicate check.
     */
    const existing =
      await LinkedInWebhookEvent.findOne({
        notificationId
      }).lean();

    if (existing) {
      return res.status(200).json({
        success: true,
        duplicate: true
      });
    }

    /*
     * Persist raw notification FIRST.
     */
    const webhookEvent =
      await LinkedInWebhookEvent.create({
        notificationId,

        eventType,

        actor:
          payload.actor ||
          payload.event?.actor ||
          null,

        organization:
          payload.organization ||
          payload.organizationId ||
          payload.event?.organization ||
          null,

        eventTime:
          payload.createdAt
            ? new Date(payload.createdAt)
            : null,

        rawBody: req.rawBody,

        payload,

        headers: {
          "x-li-signature":
            req.headers["x-li-signature"],

          "x-li-delivery-id":
            req.headers["x-li-delivery-id"],

          "content-type":
            req.headers["content-type"],

          "user-agent":
            req.headers["user-agent"]
        }
      });

    /*
     * Return success to LinkedIn quickly.
     */
    res.status(202).json({
      success: true,
      notificationId,
      eventId: webhookEvent._id
    });

    /*
     * Process asynchronously.
     */
    setImmediate(async () => {
      try {
        await processLinkedInEvent(
          webhookEvent
        );

        await LinkedInWebhookEvent.updateOne(
          {
            _id: webhookEvent._id
          },
          {
            $set: {
              processingStatus: "PROCESSED",
              processedAt: new Date()
            }
          }
        );

      } catch (error) {
        console.error(
          "LinkedIn event processing failed:",
          error
        );

        await LinkedInWebhookEvent.updateOne(
          {
            _id: webhookEvent._id
          },
          {
            $set: {
              processingStatus: "FAILED",
              processingError:
                error.message
            }
          }
        );
      }
    });

  } catch (error) {

    /*
     * Duplicate key race condition.
     *
     * Two identical notifications may arrive
     * simultaneously.
     */
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        duplicate: true
      });
    }

    console.error(
      "LinkedIn webhook error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed"
    });
  }
};
