import { Request, Response } from "express";
import mongoose from "mongoose";
import SalesInvoice from "../models/SalesInvoice";
import StockLevel from "../../models/StockLevel";
import StockMovement from "../../models/StockMovement";
import { addLedgerEntry } from "../services/ledger.service";
import Receipt from "../models/Receipt";
import SalesReturn from "../models/SalesReturn";
import Customer from "../models/Customer";
function getUserId(req: any): string {
  const id = req.user?.id;
  if (!id) throw new Error("Unauthenticated");
  return id;
}

function round2(n: number) {
  return Number((Number(n || 0)).toFixed(2));
}


function normalizePhone(v: any) {
  const s = String(v || "").replace(/\D/g, "");
  return s;
}

// CREATE SALES INVOICE (DRAFT) - Proper totals (discount + tax)
// CREATE SALES INVOICE (DRAFT) – Walk-in supported
export async function createSalesInvoice(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    const {
      customerId,
      customer, // { name, phone }
      warehouseId,
      items,
      paidAmount = 0,
    } = req.body;

    if (!warehouseId) {
      return res.status(400).json({ message: "warehouseId is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items are required" });
    }

    /* ---------------------------
       1) Resolve Customer (Option-B)
    ---------------------------- */

    let finalCustomerId: string | undefined = customerId;

    if (!finalCustomerId && customer?.name && customer?.phone) {
      const phone = normalizePhone(customer.phone);
      if (phone.length !== 10) {
        return res.status(400).json({ message: "Valid 10 digit phone required" });
      }

      let cust = await Customer.findOne({ phone });
      if (!cust) {
        cust = await Customer.create({
          name: customer.name,
          phone,
          status: "active",
        });
      }

      finalCustomerId = String(cust._id);
    }

    /* ---------------------------
       2) Calculate totals
    ---------------------------- */

    let subTotal = 0;
    let discountTotal = 0;
    let taxableTotal = 0;
    let taxTotal = 0;

    const normalizedItems = items.map((item: any) => {
      if (!item.productId) throw new Error("productId missing");

      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const discount = Math.max(0, Number(item.discount || 0));
      const taxPercent = Math.max(0, Number(item.taxPercent || 0));

      if (qty <= 0) throw new Error("quantity must be > 0");
      if (rate < 0) throw new Error("rate must be >= 0");

      const gross = round2(qty * rate);
      const taxableAmount = round2(Math.max(0, gross - discount));
      const taxAmount = round2((taxableAmount * taxPercent) / 100);
      const lineTotal = round2(taxableAmount + taxAmount);

      subTotal += gross;
      discountTotal += discount;
      taxableTotal += taxableAmount;
      taxTotal += taxAmount;

      return {
        productId: item.productId,
        quantity: qty,
        rate,
        discount,
        taxableAmount,
        taxPercent,
        taxAmount,
        lineTotal,
      };
    });

    subTotal = round2(subTotal);
    discountTotal = round2(discountTotal);
    taxableTotal = round2(taxableTotal);
    taxTotal = round2(taxTotal);

    const grandTotal = round2(taxableTotal + taxTotal);

    const paid = Math.max(0, Number(paidAmount || 0));
    const dueAmount = round2(grandTotal - paid);

    if (dueAmount < 0) {
      return res.status(400).json({ message: "paidAmount cannot exceed grandTotal" });
    }

    /* ---------------------------
       3) Create Invoice
    ---------------------------- */

    const invoice = await SalesInvoice.create({
      invoiceNo: `SI-${Date.now()}`,
      customerId: finalCustomerId,
      warehouseId,

      items: normalizedItems,

      subTotal,
      discountTotal,
      taxableTotal,
      taxTotal,
      grandTotal,

      paidAmount: paid,
      dueAmount,

      status: "DRAFT",
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    return res.json({ invoice });
  } catch (e: any) {
    return res.status(400).json({ message: e.message || "Create invoice failed" });
  }
}


// LIST SALES INVOICES
export async function listSalesInvoices(req: Request, res: Response) {
  try {
    const limit = Math.min(100, Number(req.query.limit || 20));
    const page = Math.max(1, Number(req.query.page || 1));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.status) query.status = req.query.status;

    const [rows, total] = await Promise.all([
      SalesInvoice.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customerId")
        .populate("warehouseId"),
      SalesInvoice.countDocuments(query),
    ]);

    return res.json({ rows, total, page, limit });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "List failed" });
  }
}

// GET SALES INVOICE BY ID
export async function getSalesInvoice(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const invoice = await SalesInvoice.findById(id)
      .populate("customerId")
      .populate("warehouseId");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.json({ invoice });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Fetch failed" });
  }
}

// APPROVE SALES INVOICE
// - deduct stock
// - create StockMovement (SALE)
// - ledger debit (grandTotal)
export async function approveSalesInvoice(req: Request, res: Response) {
  const session = await mongoose.startSession();

  try {
    const userId = getUserId(req);
    const { id } = req.params;

    session.startTransaction();

    const invoice = await SalesInvoice.findById(id).session(session);
    if (!invoice) throw new Error("Invoice not found");

    if (invoice.status !== "DRAFT") {
      throw new Error("Only DRAFT invoice can be approved");
    }

    for (const item of invoice.items as any[]) {
      const productId = item.productId;
      const quantity = Number(item.quantity || 0);
      const warehouseId = invoice.warehouseId;

      if (quantity <= 0) throw new Error("Invalid quantity");

      const stock = await StockLevel.findOneAndUpdate(
        { warehouseId, productId },
        { $setOnInsert: { quantity: 0 } },
        { new: true, upsert: true, session }
      );

      if (!stock) throw new Error("StockLevel error");

      if (stock.quantity < quantity) {
        throw new Error(`Insufficient stock for product ${productId}`);
      }

      stock.quantity -= quantity;
      await stock.save({ session });

      await StockMovement.create(
        [
          {
            transactionType: "SALE",
            transactionId: invoice._id,
            direction: "OUT",
            warehouseId,
            productId,
            quantityBase: quantity,
            createdBy: new mongoose.Types.ObjectId(userId),
            approvedBy: new mongoose.Types.ObjectId(userId),
            notes: `Sales Invoice ${invoice.invoiceNo}`,
          },
        ],
        { session }
      );
    }

    invoice.status = "APPROVED";
    invoice.approvedBy = new mongoose.Types.ObjectId(userId);
    await invoice.save({ session });

    // ===== LEDGER ENTRY (INVOICE DEBIT) =====
    if (invoice.customerId) {
      await addLedgerEntry({
        customerId: String(invoice.customerId),
        refType: "INVOICE",
        refId: String(invoice._id),
        debit: Number((invoice as any).grandTotal || 0),
        credit: 0,
        createdBy: userId,
        notes: `Sales Invoice ${invoice.invoiceNo}`,
        session,
      });
    }

    await session.commitTransaction();
    return res.json({ invoice });
  } catch (err: any) {
    await session.abortTransaction();
    return res.status(400).json({ message: err.message || "Approve failed" });
  } finally {
    session.endSession();
  }
}

// CANCEL SALES INVOICE
// - only APPROVED
// - block if approved receipts/returns exist
// - reverse stock (IN)
// - reverse ledger (credit grandTotal)
export async function cancelSalesInvoice(req: Request, res: Response) {
  const session = await mongoose.startSession();

  try {
    const userId = getUserId(req);
    const { id } = req.params;

    session.startTransaction();

    const invoice = await SalesInvoice.findById(id).session(session);
    if (!invoice) throw new Error("Invoice not found");

    if (invoice.status === "CANCELLED") throw new Error("Invoice already cancelled");
    if (invoice.status !== "APPROVED") throw new Error("Only APPROVED invoice can be cancelled");

    const approvedReceiptsCount = await Receipt.countDocuments({
      invoiceId: invoice._id,
      status: "APPROVED",
    }).session(session as any);

    if (approvedReceiptsCount > 0) {
      throw new Error("Cancel not allowed: APPROVED receipts exist. Cancel receipts first.");
    }

    const approvedReturnsCount = await SalesReturn.countDocuments({
      invoiceId: invoice._id,
      status: "APPROVED",
    }).session(session as any);

    if (approvedReturnsCount > 0) {
      throw new Error("Cancel not allowed: APPROVED returns exist. Cancel returns first.");
    }

    // Reverse stock (add back what was sold)
    for (const item of invoice.items as any[]) {
      const warehouseId = invoice.warehouseId;
      const productId = item.productId;
      const qty = Number(item.quantity || 0);
      if (qty <= 0) continue;

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
            transactionType: "SALE_RETURN", // or use SALE_CANCEL if you add it
            transactionId: invoice._id,
            direction: "IN",
            warehouseId,
            productId,
            quantityBase: qty,
            createdBy: new mongoose.Types.ObjectId(userId),
            approvedBy: new mongoose.Types.ObjectId(userId),
            notes: `Cancel Sales Invoice ${invoice.invoiceNo}`,
          },
        ],
        { session }
      );
    }

    // Reverse ledger: CREDIT grandTotal
    if (invoice.customerId) {
      await addLedgerEntry({
        customerId: String(invoice.customerId),
        refType: "INVOICE",
        refId: String(invoice._id),
        debit: 0,
        credit: Number((invoice as any).grandTotal || 0),
        createdBy: userId,
        notes: `Cancel Invoice ${invoice.invoiceNo}`,
        session,
      });
    }

    invoice.status = "CANCELLED";
    await invoice.save({ session });

    await session.commitTransaction();
    return res.json({ invoice });
  } catch (e: any) {
    await session.abortTransaction();
    return res.status(400).json({ message: e.message || "Cancel failed" });
  } finally {
    session.endSession();
  }
}


