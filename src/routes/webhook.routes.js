import { Router } from "express";
import { rawJson, verifyInternalSignature } from "../middlewares/verifyInternalSignature.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as webhook from "../controllers/webhook.controller.js";

const router = Router();

// INTERNAL only — see middleware header. Raw body -> signature check -> controller.
router.post("/webhook/messages", rawJson, verifyInternalSignature, asyncHandler(webhook.ingest));

export default router;
