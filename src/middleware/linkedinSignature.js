const crypto = require("crypto");

const config = require("../config/env");

function verifyLinkedInSignature(req) {
  const receivedSignature =
    req.headers["x-li-signature"];

  if (!receivedSignature) {
    return false;
  }

  if (!req.rawBody) {
    return false;
  }

  const stringToSign =
    `hmacsha256=${req.rawBody}`;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        config.linkedinClientSecret
      )
      .update(stringToSign, "utf8")
      .digest("hex");

  const received =
    Buffer.from(
      String(receivedSignature),
      "utf8"
    );

  const expected =
    Buffer.from(
      expectedSignature,
      "utf8"
    );

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    received,
    expected
  );
}

function linkedinSignatureMiddleware(
  req,
  res,
  next
) {
  try {
    if (!verifyLinkedInSignature(req)) {
      return res.status(401).json({
        success: false,
        message: "Invalid LinkedIn webhook signature"
      });
    }

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Webhook signature validation failed"
    });
  }
}

module.exports =
  linkedinSignatureMiddleware;