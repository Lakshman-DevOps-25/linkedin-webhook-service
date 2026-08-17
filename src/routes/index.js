import { Router } from "express";
import { healthz } from "../controllers/health.controller.js";
import oauthRoutes from "./oauth.routes.js";
import webhookRoutes from "./webhook.routes.js";
import messageRoutes from "./message.routes.js";

const router = Router();

router.get("/healthz", healthz);
router.use("/oauth", oauthRoutes);
router.use("/internal", webhookRoutes); // internal re-emitters (not LinkedIn)
router.use("/api", messageRoutes);

export default router;
