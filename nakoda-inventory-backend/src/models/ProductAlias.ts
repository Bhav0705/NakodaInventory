import mongoose, { Schema, Document } from 'mongoose';

export interface IProductAlias extends Document {
  productId: mongoose.Types.ObjectId;
  alias: string;
  priority: number;
}

const ProductAliasSchema = new Schema<IProductAlias>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    alias: {
      type: String,
      required: true,
      index: true,
      set: (v: string) => v.trim().toLowerCase()
    },
    priority: { type: Number, default: 999 }
  },
  { timestamps: true }
);

// Prevent duplicate aliases for same product
ProductAliasSchema.index({ productId: 1, alias: 1 }, { unique: true });

export default mongoose.model<IProductAlias>('ProductAlias', ProductAliasSchema);
