import { Request, Response } from "express";
import mongoose from "mongoose";
import Receipt from "../models/Receipt";
import SalesInvoice from "../models/SalesInvoice";
import { addLedgerEntry } from "../services/ledger.service";

function getUserId(req: any): string {
  const id = req.user?.id;
  if (!id) throw new Error("Unauthenticated");
  return id;
}

function round2(n: number) {
  return Number((Number(n || 0)).toFixed(2));
}

// CREATE receipt (DRAFT)
export async function createReceipt(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    const { invoiceId, customerId, amount, mode, reference } = req.body;

    const amt = Number(amount || 0);
    if (amt <= 0) return res.status(400).json({ message: "amount must be > 0" });
    if (!mode) return res.status(400).json({ message: "mode is required" });

    // optional: validate invoice
    let finalCustomerId = customerId;
    if (invoiceId) {
      // dueAmount already computed on invoice, so this check stays valid
      const inv = await SalesInvoice.findById(invoiceId).select("customerId status dueAmount");
      if (!inv) return res.status(404).json({ message: "Invoice not found" });
      if (inv.status === "CANCELLED") return res.status(400).json({ message: "Invoice is cancelled" });

      // if invoice has customer, prefer it
      if (inv.customerId) finalCustomerId = String(inv.customerId);

      // block advance payments for clean ERP
      if (amt > Number(inv.dueAmount || 0)) {
        return res.status(400).json({ message: "amount cannot exceed invoice dueAmount" });
      }
    }

    const receiptNo = `RC-${Date.now()}`;

    const receipt = await Receipt.create({
      receiptNo,
      invoiceId: invoiceId || undefined,
      customerId: finalCustomerId || undefined,
      amount: amt,
      mode,
      reference: reference || undefined,
      status: "DRAFT",
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    return res.json({ receipt });
  } catch (e: any) {
    return res.status(400).json({ message: e.message || "Create receipt failed" });
  }
}

// LIST receipts
export async function listReceipts(req: Request, res: Response) {
  const limit = Math.min(100, Number(req.query.limit || 20));
  const page = Math.max(1, Number(req.query.page || 1));
  const skip = (page - 1) * limit;

  const q: any = {};
  if (req.query.status) q.status = req.query.status;
  if (req.query.invoiceId) q.invoiceId = req.query.invoiceId;
  if (req.query.customerId) q.customerId = req.query.customerId;

  const [rows, total] = await Promise.all([
    Receipt.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("customerId")
      .populate("invoiceId"),
    Receipt.countDocuments(q),
  ]);

  res.json({ rows, total, page, limit });
}

// GET receipt
export async function getReceipt(req: Request, res: Response) {
  const { id } = req.params;
  const receipt = await Receipt.findById(id).populate("customerId").populate("invoiceId");
  if (!receipt) return res.status(404).json({ message: "Not found" });
  res.json({ receipt });
}

// APPROVE receipt (updates invoice paid/due + ledger CREDIT)
export async function approveReceipt(req: Request, res: Response) {
  const session = await mongoose.startSession();

  try {
    const userId = getUserId(req);
    const { id } = req.params;

    session.startTransaction();

    // 1) Fetch receipt
    const receipt = await Receipt.findById(id).session(session);
    if (!receipt) throw new Error("Receipt not found");
    if (receipt.status !== "DRAFT") throw new Error("Only DRAFT receipt can be approved");

    // 2) Fetch invoice (if linked) in OUTER scope
    let inv: any = null;

    if (receipt.invoiceId) {
      inv = await SalesInvoice.findById(receipt.invoiceId).session(session);
      if (!inv) throw new Error("Invoice not found");
      if (inv.status === "CANCELLED") throw new Error("Invoice is cancelled");

      const due = Number(inv.dueAmount || 0);
      if (receipt.amount > due) {
        throw new Error("Receipt amount exceeds invoice dueAmount");
      }

      // Update invoice amounts (Proper ERP uses grandTotal)
      inv.paidAmount = round2(Number(inv.paidAmount || 0) + Number(receipt.amount || 0));

      const gTotal = round2(Number(inv.grandTotal || 0));
      inv.dueAmount = round2(gTotal - inv.paidAmount);
      if (inv.dueAmount < 0) inv.dueAmount = 0;

      await inv.save({ session });
    }

    // 3) Approve receipt
    receipt.status = "APPROVED";
    receipt.approvedBy = new mongoose.Types.ObjectId(userId);
    await receipt.save({ session });

    // 4) LEDGER ENTRY (RECEIPT CREDIT)
    const custId =
      receipt.customerId
        ? String(receipt.customerId)
        : inv?.customerId
        ? String(inv.customerId)
        : "";

    if (custId) {
      await addLedgerEntry({
        customerId: custId,
        refType: "RECEIPT",
        refId: String(receipt._id),
        debit: 0,
        credit: Number(receipt.amount || 0),
        createdBy: userId,
        notes: `Receipt ${receipt.receiptNo}`,
        session,
      });
    }

    await session.commitTransaction();
    return res.json({ receipt });
  } catch (e: any) {
    await session.abortTransaction();
    return res.status(400).json({ message: e.message || "Approve receipt failed" });
  } finally {
    session.endSession();
  }
}
