import mongoose, { Schema, Document } from 'mongoose';

export interface IStockLevel extends Document {
  warehouseId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number; // always pieces
}

const StockLevelSchema = new Schema<IStockLevel>(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0 // do not allow negative inventory
    }
  },
  { timestamps: true }
);

// one record per warehouse per product
StockLevelSchema.index({ warehouseId: 1, productId: 1 }, { unique: true });

export default mongoose.model<IStockLevel>('StockLevel', StockLevelSchema);
