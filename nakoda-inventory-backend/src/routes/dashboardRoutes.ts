import express from "express";
import { getDashboardSummary } from "../controllers/dashboardController";

const router = express.Router();

// add auth middleware here if you want, e.g. requireAuth
router.get("/summary", getDashboardSummary);

export default router;
