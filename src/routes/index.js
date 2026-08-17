import { Router } from "express";
import { healthz } from "../controllers/health.controller.js";
import webhookRoutes from "./webhook.routes.js";
import messageRoutes from "./message.routes.js";
import linkedinWebhookRoutes from "./linkedinWebhook.routes.js";

const router = Router();

// Ops probe.
router.get("/healthz", healthz);

// LinkedIn's OWN webhook (challenge-response validation + signed events).
// Full path: /linkedin/webhook  <-- this is the URL to paste in the portal.
// NOTE: for this app the only event type is member verification / profile status
// changes — NOT messages.
router.use("/linkedin", linkedinWebhookRoutes);

// Internal webhook ingress (your own re-emitters; not LinkedIn).
router.use("/internal", webhookRoutes);

// Read-back API to verify what the internal webhook archived (optional).
router.use("/api", messageRoutes);

export default router;
