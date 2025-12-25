
import mongoose, { Schema, Document } from "mongoose";

export type ReceiptMode = "CASH" | "UPI" | "BANK" | "CARD";
export type ReceiptStatus = "DRAFT" | "APPROVED" | "CANCELLED";

export interface IReceipt extends Document {
  receiptNo: string;

  customerId?: mongoose.Types.ObjectId; // can be derived from invoice
  invoiceId?: mongoose.Types.ObjectId;  // optional (advance receipt possible)

  amount: number;
  mode: ReceiptMode;
  reference?: string; // UPI txn id / bank ref

  status: ReceiptStatus;

  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    receiptNo: { type: String, required: true, unique: true },

    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    invoiceId: { type: Schema.Types.ObjectId, ref: "SalesInvoice" },

    amount: { type: Number, required: true, min: 1 },
    mode: { type: String, enum: ["CASH", "UPI", "BANK", "CARD"], required: true },
    reference: String,

    status: { type: String, enum: ["DRAFT", "APPROVED", "CANCELLED"], default: "DRAFT" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<IReceipt>("Receipt", ReceiptSchema);








