import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  category?: string;
  baseUnit: string;
  mainImageUrl?: string;
  status: 'active' | 'inactive';
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: String,
    baseUnit: { type: String, default: 'PCS' },
    mainImageUrl: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>('Product', ProductSchema);
