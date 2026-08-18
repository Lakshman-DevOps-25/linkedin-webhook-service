import { Router } from "express";
import { healthz } from "../controllers/health.controller.js";
import webhookRoutes from "./webhook.routes.js";
import messageRoutes from "./message.routes.js";

const router = Router();

// Ops probe.
router.get("/healthz", healthz);


// Internal webhook ingress (your own re-emitters; not LinkedIn).
router.use("/internal", webhookRoutes);

// Read-back API to verify what the internal webhook archived (optional).
router.use("/api", messageRoutes);

export default router;
