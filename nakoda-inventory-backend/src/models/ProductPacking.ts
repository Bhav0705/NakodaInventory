import mongoose, { Schema, Document } from 'mongoose';

export type PackingType = 'LOOSE' | 'KATTA' | 'MASTER' | 'OTHER';

export interface IProductPacking extends Document {
  productId: mongoose.Types.ObjectId;
  type: PackingType;
  unitName: string;
  conversionToBase: number;
  isDefault: boolean;
}

const ProductPackingSchema = new Schema<IProductPacking>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: ['LOOSE', 'KATTA', 'MASTER', 'OTHER'], required: true },
    unitName: { type: String, required: true },
    conversionToBase: { type: Number, required: true },
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model<IProductPacking>('ProductPacking', ProductPackingSchema);
