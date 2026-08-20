import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as message from "../controllers/message.controller.js";

const router = Router();
router.get("/messages", validate(message.messageQuerySchema, "query"), asyncHandler(message.list));
export default router;
