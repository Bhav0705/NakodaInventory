import { Request, Response } from "express";
import mongoose from "mongoose";
import SalesReturn from "../models/SalesReturn";
import SalesInvoice from "../models/SalesInvoice";
import StockLevel from "../../models/StockLevel";
import StockMovement from "../../models/StockMovement";
import { addLedgerEntry } from "../services/ledger.service";

function getUserId(req: any): string {
  const id = req.user?.id;
  if (!id) throw new Error("Unauthenticated");
  return id;
}

function round2(n: number) {
  return Number((Number(n || 0)).toFixed(2));
}

// CREATE RETURN (DRAFT) - Proper totals (discount + tax)
export async function createSalesReturn(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    const {
      invoiceId,
      warehouseId,
      items,
      refundAmount = 0,
      refundMode,
      refundRef,
    } = req.body;

    if (!invoiceId) return res.status(400).json({ message: "invoiceId is required" });
    if (!warehouseId) return res.status(400).json({ message: "warehouseId is required" });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "items are required" });

    // Validate invoice exists
    const invoice = await SalesInvoice.findById(invoiceId).select("status warehouseId grandTotal");
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.status === "CANCELLED") return res.status(400).json({ message: "Invoice cancelled" });

    let subTotal = 0;
    let discountTotal = 0;
    let taxableTotal = 0;
    let taxTotal = 0;

    const normalizedItems = items.map((x: any) => {
      if (!x.productId) throw new Error("productId missing");

      const quantity = Number(x.quantity || 0);
      const rate = Number(x.rate || 0);

      const discount = Math.max(0, Number(x.discount || 0));      // ₹
      const taxPercent = Math.max(0, Number(x.taxPercent || 0));  // %

      const condition = (x.condition || "RESALE") as "RESALE" | "DAMAGED";

      if (quantity <= 0) throw new Error("quantity must be > 0");
      if (rate < 0) throw new Error("rate must be >= 0");
      if (condition !== "RESALE" && condition !== "DAMAGED") throw new Error("invalid condition");

      const gross = round2(quantity * rate);
      const taxableAmount = round2(Math.max(0, gross - discount));
      const taxAmount = round2((taxableAmount * taxPercent) / 100);
      const lineTotal = round2(taxableAmount + taxAmount);

      subTotal += gross;
      discountTotal += discount;
      taxableTotal += taxableAmount;
      taxTotal += taxAmount;

      return {
        productId: x.productId,
        quantity,
        rate,
        discount,
        taxableAmount,
        taxPercent,
        taxAmount,
        amount: lineTotal, // keep existing field name used in model as amount
        reason: x.reason || undefined,
        condition,
      };
    });

    subTotal = round2(subTotal);
    discountTotal = round2(discountTotal);
    taxableTotal = round2(taxableTotal);
    taxTotal = round2(taxTotal);

    const returnGrandTotal = round2(taxableTotal + taxTotal);

    const rAmt = Math.max(0, Number(refundAmount || 0));
    if (rAmt > returnGrandTotal) {
      return res.status(400).json({ message: "refundAmount cannot exceed return total" });
    }

    // Optional safety: prevent return more than invoice grand total
    if (returnGrandTotal > Number((invoice as any).grandTotal || 0)) {
      return res.status(400).json({ message: "Return total cannot exceed invoice grandTotal" });
    }

    const returnNo = `SR-${Date.now()}`;

    const doc = await SalesReturn.create({
      returnNo,
      invoiceId,
      warehouseId,
      items: normalizedItems,

      // keep schema field name "subtotal", but now it means RETURN GRAND TOTAL
      subtotal: returnGrandTotal,

      refundAmount: rAmt,
      refundMode: refundMode || undefined,
      refundRef: refundRef || undefined,
      status: "DRAFT",
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    return res.json({ salesReturn: doc });
  } catch (e: any) {
    return res.status(400).json({ message: e.message || "Create return failed" });
  }
}

// LIST RETURNS
export async function listSalesReturns(req: Request, res: Response) {
  const limit = Math.min(100, Number(req.query.limit || 20));
  const page = Math.max(1, Number(req.query.page || 1));
  const skip = (page - 1) * limit;

  const q: any = {};
  if (req.query.status) q.status = req.query.status;
  if (req.query.invoiceId) q.invoiceId = req.query.invoiceId;

  const [rows, total] = await Promise.all([
    SalesReturn.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("invoiceId")
      .populate("warehouseId"),
    SalesReturn.countDocuments(q),
  ]);

  res.json({ rows, total, page, limit });
}

// GET RETURN BY ID
export async function getSalesReturn(req: Request, res: Response) {
  const { id } = req.params;
  const doc = await SalesReturn.findById(id)
    .populate("invoiceId")
    .populate("warehouseId");
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json({ salesReturn: doc });
}

// APPROVE RETURN
export async function approveSalesReturn(req: Request, res: Response) {
  const session = await mongoose.startSession();
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    session.startTransaction();

    const ret = await SalesReturn.findById(id).session(session);
    if (!ret) throw new Error("Return not found");
    if (ret.status !== "DRAFT") throw new Error("Only DRAFT return can be approved");

    const invoice = await SalesInvoice.findById(ret.invoiceId).session(session);
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "CANCELLED") throw new Error("Invoice cancelled");

    // Stock IN
    for (const item of ret.items as any[]) {
      const warehouseId = ret.warehouseId;
      const productId = item.productId;
      const qty = Number(item.quantity || 0);
      if (qty <= 0) throw new Error("Invalid return quantity");

      const stock = await StockLevel.findOneAndUpdate(
        { warehouseId, productId },
        { $setOnInsert: { quantity: 0 } },
        { new: true, upsert: true, session }
      );

      if (!stock) throw new Error("StockLevel upsert failed");

      stock.quantity = stock.quantity + qty;
      await stock.save({ session });

      await StockMovement.create(
        [
          {
            transactionType: "SALE_RETURN",
            transactionId: ret._id,
            direction: "IN",
            warehouseId,
            productId,
            quantityBase: qty,
            createdBy: new mongoose.Types.ObjectId(userId),
            approvedBy: new mongoose.Types.ObjectId(userId),
            notes: `Sales Return ${ret.returnNo} (Invoice ${invoice.invoiceNo})`,
          },
        ],
        { session }
      );
    }

    // Financial adjustment (Proper ERP): reduce invoice.grandTotal by return subtotal (which is return grand total)
    (invoice as any).grandTotal = round2(Number((invoice as any).grandTotal || 0) - Number(ret.subtotal || 0));
    if ((invoice as any).grandTotal < 0) (invoice as any).grandTotal = 0;

    // due = grandTotal - paid
    invoice.dueAmount = round2(Number((invoice as any).grandTotal || 0) - Number(invoice.paidAmount || 0));
    if (invoice.dueAmount < 0) invoice.dueAmount = 0;

    await invoice.save({ session });

    ret.status = "APPROVED";
    ret.approvedBy = new mongoose.Types.ObjectId(userId);
    await ret.save({ session });

    // ===== LEDGER ENTRY (RETURN CREDIT) =====
    if (invoice.customerId) {
      await addLedgerEntry({
        customerId: String(invoice.customerId),
        refType: "RETURN",
        refId: String(ret._id),
        debit: 0,
        credit: Number(ret.subtotal || 0),
        createdBy: userId,
        notes: `Sales Return ${ret.returnNo}`,
        session,
      });
    }

    await session.commitTransaction();
    return res.json({ salesReturn: ret, invoice });
  } catch (e: any) {
    await session.abortTransaction();
    return res.status(400).json({ message: e.message || "Approve return failed" });
  } finally {
    session.endSession();
  }
}
