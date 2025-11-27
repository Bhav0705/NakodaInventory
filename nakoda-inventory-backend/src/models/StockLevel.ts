import mongoose, { Schema, Document } from 'mongoose';

export interface IStockLevel extends Document {
  warehouseId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
}

const StockLevelSchema = new Schema<IStockLevel>(
  {
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 0 }
  },
  { timestamps: true }
);

StockLevelSchema.index({ warehouseId: 1, productId: 1 }, { unique: true });

export default mongoose.model<IStockLevel>('StockLevel', StockLevelSchema);
