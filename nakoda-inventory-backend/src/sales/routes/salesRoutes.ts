 import { Router } from "express";
import {
  approveSalesInvoice,
  createSalesInvoice,
  getSalesInvoice,
  listSalesInvoices,
} from "../controllers/salesInvoiceController";

import { auth } from "../../middleware/auth";
import { requireRole } from "../../middleware/roles";
import { requireWarehouseAccess } from "../../middleware/warehouseAccess";
import { createReceipt, listReceipts, getReceipt, approveReceipt } from "../controllers/receiptController";
import {
  approveSalesReturn,
  createSalesReturn,
  getSalesReturn,
  listSalesReturns,
} from "../controllers/salesReturnController";
import { getCustomerLedger } from "../controllers/ledgerController";
import { cancelSalesInvoice } from "../controllers/salesInvoiceController";
import { customerOutstandingReport, dailyCollectionsReport } from "../controllers/reportsController";

const router = Router();

// auth middleware
router.use(auth);

// Create sales invoice (warehouseId from body)
router.post(
  "/invoices",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager"),
  requireWarehouseAccess("warehouseId"),
  createSalesInvoice
);

// List invoices
router.get(
  "/invoices",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager", "viewer"),
  listSalesInvoices
);

// Get invoice by id
router.get(
  "/invoices/:id",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager", "viewer"),
  getSalesInvoice
);

// Approve invoice (stock OUT)
router.post(
  "/invoices/:id/approve",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager"),
  approveSalesInvoice
);



router.post(
  "/receipts",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager"),
  createReceipt
);

router.get(
  "/receipts",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager", "viewer"),
  listReceipts
);

router.get(
  "/receipts/:id",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager", "viewer"),
  getReceipt
);

router.post(
  "/receipts/:id/approve",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager"),
  approveReceipt
);


router.post(
  "/returns",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager"),
  requireWarehouseAccess("warehouseId"),
  createSalesReturn
);

router.get(
  "/returns",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager", "viewer"),
  listSalesReturns
);

router.get(
  "/returns/:id",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager", "viewer"),
  getSalesReturn
);

router.post(
  "/returns/:id/approve",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager"),
  approveSalesReturn
);

router.get(
  "/ledger",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager", "viewer"),
  getCustomerLedger
);


// Cancel invoice
router.post(
  "/invoices/:id/cancel",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager"),
  cancelSalesInvoice
);

// Reports
router.get(
  "/reports/outstanding",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager", "viewer"),
  customerOutstandingReport
);

router.get(
  "/reports/collections-daily",
  requireRole("super_admin", "warehouse_admin", "warehouse_manager", "viewer"),
  dailyCollectionsReport
);


export default router;
