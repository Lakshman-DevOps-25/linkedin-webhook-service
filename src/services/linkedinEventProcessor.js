const LinkedInMessage =
  require("../models/LinkedInMessage");

const LinkedInPost =
  require("../models/LinkedInPost");

const LinkedInComment =
  require("../models/LinkedInComment");

const LinkedInReaction =
  require("../models/LinkedInReaction");

const LinkedInMedia =
  require("../models/LinkedInMedia");


function detectEventType(payload) {
  const value =
    payload.eventType ||
    payload.type ||
    payload.event?.type ||
    payload.event?.eventType ||
    "";

  return String(value).toUpperCase();
}


function getNotificationId(webhookEvent) {
  return webhookEvent.notificationId;
}


async function processMessage(
  webhookEvent
) {
  const payload =
    webhookEvent.payload;

  const notificationId =
    getNotificationId(webhookEvent);

  const data =
    payload.data ||
    payload.message ||
    payload.event ||
    payload;

  await LinkedInMessage.create({
    notificationId,

    messageId:
      data.messageId ||
      data.id ||
      null,

    conversationId:
      data.conversationId ||
      null,

    sender:
      data.sender ||
      data.from ||
      null,

    recipient:
      data.recipient ||
      data.to ||
      null,

    message:
      data.text ||
      data.message ||
      data.content ||
      null,

    messageType:
      data.messageType ||
      data.type ||
      null,

    direction:
      data.direction ||
      "UNKNOWN",

    media:
      data.media ||
      null,

    event: payload
  });
}


async function processPost(
  webhookEvent
) {
  const payload =
    webhookEvent.payload;

  const data =
    payload.data ||
    payload.post ||
    payload.event ||
    payload;

  await LinkedInPost.create({
    notificationId:
      webhookEvent.notificationId,

    postId:
      data.postId ||
      data.id ||
      null,

    author:
      data.author ||
      data.actor ||
      null,

    organization:
      data.organization ||
      data.organizationId ||
      null,

    text:
      data.text ||
      data.commentary ||
      data.content ||
      null,

    media:
      data.media ||
      null,

    event: payload
  });
}


async function processComment(
  webhookEvent
) {
  const payload =
    webhookEvent.payload;

  const data =
    payload.data ||
    payload.comment ||
    payload.event ||
    payload;

  await LinkedInComment.create({
    notificationId:
      webhookEvent.notificationId,

    commentId:
      data.commentId ||
      data.id ||
      null,

    postId:
      data.postId ||
      data.ugcPost ||
      null,

    author:
      data.author ||
      data.actor ||
      null,

    text:
      data.text ||
      data.message ||
      data.content ||
      null,

    parentCommentId:
      data.parentCommentId ||
      null,

    event: payload
  });
}


async function processReaction(
  webhookEvent
) {
  const payload =
    webhookEvent.payload;

  const data =
    payload.data ||
    payload.reaction ||
    payload.event ||
    payload;

  await LinkedInReaction.create({
    notificationId:
      webhookEvent.notificationId,

    reactionId:
      data.reactionId ||
      data.id ||
      null,

    postId:
      data.postId ||
      data.ugcPost ||
      null,

    actor:
      data.actor ||
      null,

    reactionType:
      data.reactionType ||
      data.type ||
      null,

    event: payload
  });
}


async function processMedia(
  webhookEvent
) {
  const payload =
    webhookEvent.payload;

  const data =
    payload.data ||
    payload.media ||
    payload.event ||
    payload;

  const mediaItems =
    Array.isArray(data)
      ? data
      : data.media
        ? data.media
        : [data];

  for (const media of mediaItems) {

    await LinkedInMedia.create({
      notificationId:
        webhookEvent.notificationId,

      mediaId:
        media.mediaId ||
        media.id ||
        null,

      mediaType:
        media.mediaType ||
        media.type ||
        null,

      fileName:
        media.fileName ||
        media.name ||
        null,

      mimeType:
        media.mimeType ||
        media.mime_type ||
        null,

      url:
        media.url ||
        media.downloadUrl ||
        null,

      sourceEvent:
        payload
    });
  }
}


async function processLinkedInEvent(
  webhookEvent
) {
  const eventType =
    detectEventType(
      webhookEvent.payload
    );

  console.log(
    `Processing LinkedIn event: ${eventType}`
  );

  /*
   * These are intentionally broad mappings.
   *
   * Keep the original event in
   * linkedin_webhook_events because LinkedIn
   * products have different payload schemas.
   */

  if (
    eventType.includes("MESSAGE") ||
    eventType.includes("INMAIL")
  ) {
    await processMessage(
      webhookEvent
    );
    return;
  }

  if (
    eventType.includes("COMMENT") ||
    eventType.includes("REPLY")
  ) {
    await processComment(
      webhookEvent
    );
    return;
  }

  if (
    eventType.includes("REACTION") ||
    eventType.includes("LIKE")
  ) {
    await processReaction(
      webhookEvent
    );
    return;
  }

  if (
    eventType.includes("MEDIA")
  ) {
    await processMedia(
      webhookEvent
    );
    return;
  }

  if (
    eventType.includes("POST") ||
    eventType.includes("SHARE") ||
    eventType.includes("ORGANIZATION")
  ) {
    await processPost(
      webhookEvent
    );
    return;
  }

  /*
   * Unknown event:
   *
   * It is already safely stored in
   * linkedin_webhook_events.
   */
  console.log(
    `Unknown LinkedIn event: ${eventType}`
  );
}


module.exports = {
  processLinkedInEvent
};