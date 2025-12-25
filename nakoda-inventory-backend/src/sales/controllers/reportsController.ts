import { Request, Response } from "express";
import mongoose from "mongoose";
import CustomerLedger from "../models/CustomerLedger";
import Receipt from "../models/Receipt";

/* ===========================
   Helpers
=========================== */

function parseDateOrDefault(v: any, fallback: Date) {
  const d = v ? new Date(String(v)) : fallback;
  return isNaN(d.getTime()) ? fallback : d;
}

function round2(n: number) {
  return Number(Number(n || 0).toFixed(2));
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function nextDayStart(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}



export async function customerOutstandingReport(req: Request, res: Response) {
  const limit = Math.min(200, Number(req.query.limit || 50));
  const page = Math.max(1, Number(req.query.page || 1));
  const skip = (page - 1) * limit;

  const rows = await CustomerLedger.aggregate([
    {
      $group: {
        _id: "$customerId",
        balance: { $sum: { $subtract: ["$debit", "$credit"] } },
        lastAt: { $max: "$createdAt" },
      },
    },
    { $match: { balance: { $ne: 0 } } },
    { $sort: { balance: -1, lastAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "customers",
        localField: "_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        customerId: "$_id",
        balance: { $round: ["$balance", 2] },
        lastAt: 1,
        customer: {
          _id: "$customer._id",
          name: "$customer.name",
          phone: "$customer.phone",
          gstin: "$customer.gstin",
          status: "$customer.status",
        },
      },
    },
  ]);

  res.json({ page, limit, rows });
}

/* =========================================================
   2) CUSTOMER LEDGER STATEMENT
   GET /api/sales/reports/ledger?customerId=&from=&to=
========================================================= */

export async function customerLedgerReport(req: Request, res: Response) {
  const { customerId } = req.query as any;
  if (!customerId) {
    return res.status(400).json({ message: "customerId is required" });
  }

  const limit = Math.min(200, Number(req.query.limit || 50));
  const page = Math.max(1, Number(req.query.page || 1));
  const skip = (page - 1) * limit;

  const now = new Date();
  const from = parseDateOrDefault(req.query.from, new Date(0));
  const to = parseDateOrDefault(req.query.to, now);

  const match: any = {
    customerId: new mongoose.Types.ObjectId(customerId),
    createdAt: { $gte: from, $lte: to },
  };

  const [rows, totals] = await Promise.all([
    CustomerLedger.find(match)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),

    CustomerLedger.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$customerId",
          debit: { $sum: "$debit" },
          credit: { $sum: "$credit" },
        },
      },
    ]),
  ]);

  const debit = round2(totals?.[0]?.debit || 0);
  const credit = round2(totals?.[0]?.credit || 0);
  const balance = round2(debit - credit);

  res.json({
    page,
    limit,
    rows,
    summary: { debit, credit, balance },
  });
}

/* =========================================================
   3) DAILY COLLECTIONS REPORT
   GET /api/sales/reports/collections-daily?from=&to=
========================================================= */

export async function dailyCollectionsReport(req: Request, res: Response) {
  const now = new Date();

  // parse raw
  const fromRaw = parseDateOrDefault(
    req.query.from,
    new Date(now.getFullYear(), now.getMonth(), now.getDate())
  );

  // if user gave same-day "to", we still want full day, so make exclusive end = next day start
  const toRaw = parseDateOrDefault(
    req.query.to,
    fromRaw // default to same as from if not provided
  );

  const from = startOfDay(fromRaw);
  const to = nextDayStart(toRaw); // ✅ exclusive end boundary (covers full 'to' day)

  // Mode-wise per day
  const rows = await Receipt.aggregate([
    {
      $match: {
        status: "APPROVED",
        createdAt: { $gte: from, $lt: to },
      },
    },
    {
      $addFields: {
        day: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: "Asia/Kolkata",
          },
        },
      },
    },
    {
      $group: {
        _id: { day: "$day", mode: "$mode" },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.day": 1, "_id.mode": 1 } },
    {
      $project: {
        _id: 0,
        day: "$_id.day",
        mode: "$_id.mode",
        totalAmount: { $round: ["$totalAmount", 2] },
        count: 1,
      },
    },
  ]);

  // Day-wise grand total
  const dayTotals = await Receipt.aggregate([
    {
      $match: {
        status: "APPROVED",
        createdAt: { $gte: from, $lt: to },
      },
    },
    {
      $addFields: {
        day: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: "Asia/Kolkata",
          },
        },
      },
    },
    {
      $group: {
        _id: "$day",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        day: "$_id",
        total: { $round: ["$total", 2] },
        count: 1,
      },
    },
  ]);

  res.json({ from, to, rows, dayTotals });
}

