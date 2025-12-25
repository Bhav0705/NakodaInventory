import { Request, Response } from "express";
import Customer from "../models/Customer";

export async function listCustomers(req: Request, res: Response) {
  const limit = Math.min(500, Number(req.query.limit || 100));
  const page = Math.max(1, Number(req.query.page || 1));
  const skip = (page - 1) * limit;

  const q: any = {};
  if (req.query.q) {
    q.name = { $regex: String(req.query.q), $options: "i" };
  }
  if (req.query.status) q.status = req.query.status;

  const [rows, total] = await Promise.all([
    Customer.find(q).sort({ name: 1 }).skip(skip).limit(limit),
    Customer.countDocuments(q),
  ]);

  res.json({ rows, total, page, limit });
}
