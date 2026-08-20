import { Router } from "express";
import express from "express";
import { challenge, receiveEvent } from "../controllers/linkedinWebhook.controller.js";

const router = Router();

// GET = LinkedIn's validation challenge (no body).
router.get("/webhook", challenge);

// POST = signed event notifications. Raw body so the signature covers exact bytes.
router.post("/webhook", express.raw({ type: "*/*", limit: "1mb" }), receiveEvent);

export default router;
