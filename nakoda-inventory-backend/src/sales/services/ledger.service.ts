import mongoose from "mongoose";
import CustomerLedger, { LedgerRefType } from "../models/CustomerLedger";

export async function getCustomerLastBalance(params: {
  customerId: string;
  session?: mongoose.ClientSession;
}) {
  const last = await CustomerLedger.findOne({ customerId: params.customerId })
    .sort({ createdAt: -1 })
    .session(params.session || null);

  return Number(last?.balanceAfter || 0);
}

export async function addLedgerEntry(params: {
  customerId: string;
  refType: LedgerRefType;
  refId: string;
  debit?: number;
  credit?: number;
  createdBy: string;
  notes?: string;
  session?: mongoose.ClientSession;
}) {
  const debit = Math.max(0, Number(params.debit || 0));
  const credit = Math.max(0, Number(params.credit || 0));

  if (debit === 0 && credit === 0) {
    throw new Error("Ledger entry must have debit or credit");
  }

  const prev = await getCustomerLastBalance({ customerId: params.customerId, session: params.session });
  const balanceAfter = Number((prev + debit - credit).toFixed(2));

  const [entry] = await CustomerLedger.create(
    [
      {
        customerId: new mongoose.Types.ObjectId(params.customerId),
        refType: params.refType,
        refId: new mongoose.Types.ObjectId(params.refId),
        debit,
        credit,
        balanceAfter,
        createdBy: new mongoose.Types.ObjectId(params.createdBy),
        notes: params.notes,
        timestamp: new Date(),
      },
    ],
    { session: params.session }
  );

  return entry;
}
