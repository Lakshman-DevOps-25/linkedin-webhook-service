const logger = require("../utils/logger");

module.exports = (
  err,
  req,
  res,
  next
) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
};