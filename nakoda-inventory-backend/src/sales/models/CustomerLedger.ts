import mongoose, { Schema, Document } from "mongoose";

export type LedgerRefType = "INVOICE" | "RECEIPT" | "RETURN";

export interface ICustomerLedger extends Document {
  customerId: mongoose.Types.ObjectId;

  refType: LedgerRefType;
  refId: mongoose.Types.ObjectId;


  debit: number;
  credit: number;

  balanceAfter: number; 

  createdBy: mongoose.Types.ObjectId;
  timestamp: Date;
  notes?: string;
}

const CustomerLedgerSchema = new Schema<ICustomerLedger>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },

    refType: { type: String, enum: ["INVOICE", "RECEIPT", "RETURN"], required: true },
    refId: { type: Schema.Types.ObjectId, required: true },

    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },

    balanceAfter: { type: Number, required: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    timestamp: { type: Date, default: Date.now },
    notes: String,
  },
  { timestamps: true }
);

CustomerLedgerSchema.index({ customerId: 1, createdAt: -1 });

export default mongoose.model<ICustomerLedger>("CustomerLedger", CustomerLedgerSchema);
