import { logger } from "../config/logger.js";
/**
 * Validation middleware factory. Validates a request segment ('query'|'body'|'params')
 * against a zod schema and replaces it with the parsed value.
 */
export function validate(schema, segment = "query") {
  logger.debug({ segment }, "validate: building validation middleware");
  return (req, res, next) => {
    logger.debug({ segment }, "validate: validating request segment");
    const parsed = schema.safeParse(req[segment]);
    if (!parsed.success) {
      return res.status(400).json({ error: "validation failed", issues: parsed.error.issues });
    }
    req[segment] = parsed.data;
    next();
  };
}
