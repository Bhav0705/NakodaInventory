import mongoose, { Schema, Document } from "mongoose";

export type ReturnStatus = "DRAFT" | "APPROVED" | "CANCELLED";
export type ReturnCondition = "RESALE" | "DAMAGED";

export interface IReturnItem {
  productId: mongoose.Types.ObjectId;
  quantity: number; // PCS
  rate: number;     // rate used for refund/adjust
  amount: number;   // quantity * rate
  reason?: string;
  condition: ReturnCondition;
}

export interface ISalesReturn extends Document {
  returnNo: string;

  invoiceId: mongoose.Types.ObjectId;     // required (controlled returns)
  warehouseId: mongoose.Types.ObjectId;   // where stock goes back (same as sale warehouse)

  items: IReturnItem[];

  subtotal: number;       // refund/adjust base
  refundAmount: number;   // actual refund (<= subtotal)
  refundMode?: "CASH" | "UPI" | "BANK" | "CARD";
  refundRef?: string;

  status: ReturnStatus;

  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
}

const ReturnItemSchema = new Schema<IReturnItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    reason: String,
    condition: { type: String, enum: ["RESALE", "DAMAGED"], default: "RESALE", required: true },
  },
  { _id: false }
);

const SalesReturnSchema = new Schema<ISalesReturn>(
  {
    returnNo: { type: String, required: true, unique: true },

    invoiceId: { type: Schema.Types.ObjectId, ref: "SalesInvoice", required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },

    items: { type: [ReturnItemSchema], required: true },

    subtotal: { type: Number, required: true },
    refundAmount: { type: Number, default: 0 },
    refundMode: { type: String, enum: ["CASH", "UPI", "BANK", "CARD"] },
    refundRef: String,

    status: { type: String, enum: ["DRAFT", "APPROVED", "CANCELLED"], default: "DRAFT" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<ISalesReturn>("SalesReturn", SalesReturnSchema);