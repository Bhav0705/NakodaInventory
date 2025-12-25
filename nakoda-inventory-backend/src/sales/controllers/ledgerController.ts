import { Request, Response } from "express";
import CustomerLedger from "../models/CustomerLedger";

export async function getCustomerLedger(req: Request, res: Response) {
  const { customerId } = req.query as any;
  if (!customerId) return res.status(400).json({ message: "customerId required" });

  const limit = Math.min(200, Number(req.query.limit || 50));
  const page = Math.max(1, Number(req.query.page || 1));
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    CustomerLedger.find({ customerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CustomerLedger.countDocuments({ customerId }),
  ]);

  const latest = rows.length ? rows[0].balanceAfter : 0;

  res.json({ rows, total, page, limit, balance: latest });
}
