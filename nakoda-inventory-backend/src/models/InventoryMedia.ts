import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryMedia extends Document {
  transactionType: 'GRN' | 'DISPATCH' | 'TRANSFER' | 'ADJUSTMENT';
  transactionId: mongoose.Types.ObjectId;
  direction: 'IN' | 'OUT';
  warehouseId: mongoose.Types.ObjectId;
  fileType: 'image' | 'video';
  localPath: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventoryMediaSchema = new Schema<IInventoryMedia>(
  {
    transactionType: { type: String, required: true },
    transactionId: { type: Schema.Types.ObjectId, required: true },
    direction: { type: String, enum: ['IN', 'OUT'], required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    fileType: { type: String, enum: ['image', 'video'], required: true },
    localPath: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model<IInventoryMedia>('InventoryMedia', InventoryMediaSchema);
