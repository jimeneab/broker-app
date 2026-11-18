import { Router } from "express";
import { getHealth } from "../controllers/healthController.js";
import { getMe, putRiskProfile } from "../controllers/meController.js";
import { requireAuth } from "../middlewares/auth.js";

export const router = Router();

router.get("/health", getHealth);
// Everything below requires auth (and runs before the 404, so unknown routes without a token are 401).
router.use(requireAuth);
router.get("/me", getMe);
router.put("/me/risk-profile", putRiskProfile);
