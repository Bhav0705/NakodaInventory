import { Router } from "express";
import { auth } from "../../middleware/auth";
import { requireRole } from "../../middleware/roles";
import { listCustomers } from "../controllers/customersController";

const router = Router();
router.use(auth);

router.get(
  "/",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager", "viewer"),
  listCustomers
);

export default router;
