import mongoose, { Schema, Document } from 'mongoose';

export type BaseUnit = 'PCS';

export interface IProduct extends Document {
  name: string;
  sku: string;
  category?: string;
  baseUnit: BaseUnit;  // always 'PCS'
  mainImageUrl?: string;
  status: 'active' | 'inactive';
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: String,

    // base unit fixed to PCS
    baseUnit: {
      type: String,
      enum: ['PCS'],
      default: 'PCS',
      required: true
    },

    mainImageUrl: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>('Product', ProductSchema);
