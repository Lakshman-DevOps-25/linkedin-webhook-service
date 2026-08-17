import { Router } from "express";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as oauth from "../controllers/oauth.controller.js";

const router = Router();
router.get("/start", oauth.start);
router.get("/callback", asyncHandler(oauth.callback));
export default router;
