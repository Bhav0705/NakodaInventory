import mongoose, { Schema, Document } from "mongoose";

export type CustomerStatus = "active" | "inactive";

export interface ICustomer extends Document {
  name: string;
  phone?: string;
  gstin?: string;
  address?: string;
  status: CustomerStatus;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    gstin: { type: String, trim: true },
    address: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

CustomerSchema.index({ name: 1 });
CustomerSchema.index({ phone: 1 });

export default mongoose.model<ICustomer>("Customer", CustomerSchema);
