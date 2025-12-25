import mongoose, { Schema, Document } from "mongoose";

export type LedgerRefType = "INVOICE" | "RECEIPT" | "RETURN";

export interface ILedgerEntry extends Document {
  customerId: mongoose.Types.ObjectId;
  refType: LedgerRefType;
  refId: string;

  debit: number;
  credit: number;

  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    refType: { type: String, enum: ["INVOICE", "RECEIPT", "RETURN"], required: true },
    refId: { type: String, required: true },

    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },

    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

LedgerEntrySchema.index({ customerId: 1, createdAt: -1 });
LedgerEntrySchema.index({ refType: 1, refId: 1 });

export default mongoose.model<ILedgerEntry>("LedgerEntry", LedgerEntrySchema);
