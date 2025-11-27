import mongoose, { Schema, Document } from 'mongoose';

export interface IProductAlias extends Document {
  productId: mongoose.Types.ObjectId;
  alias: string;
  priority: number;
}

const ProductAliasSchema = new Schema<IProductAlias>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    alias: { type: String, required: true, index: true },
    priority: { type: Number, default: 100 }
  },
  { timestamps: true }
);

export default mongoose.model<IProductAlias>('ProductAlias', ProductAliasSchema);
