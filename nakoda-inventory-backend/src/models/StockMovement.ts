import mongoose, { Schema, Document } from 'mongoose';

export type MovementType =
  | 'GRN'
  | 'DISPATCH'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT_POSITIVE'
  | 'ADJUSTMENT_NEGATIVE';

export interface IStockMovement extends Document {
  transactionType: MovementType;
  transactionId: mongoose.Types.ObjectId;
  direction: 'IN' | 'OUT';
  warehouseId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantityBase: number; // always pieces
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  timestamp: Date;
  notes?: string;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    transactionType: { type: String, required: true },
    transactionId: { type: Schema.Types.ObjectId, required: true },
    direction: { type: String, enum: ['IN', 'OUT'], required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },

    // Always store in pieces
    quantityBase: { type: Number, required: true, min: 1 },

    // packingType removed
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    notes: String
  },
  { timestamps: true }
);

export default mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
