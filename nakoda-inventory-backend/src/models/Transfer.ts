// src/models/Transfer.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITransferLine {
  productId: mongoose.Types.ObjectId;
  quantity: number;       // pieces to move
}

export interface ITransfer extends Document {
  fromWarehouseId: mongoose.Types.ObjectId;
  toWarehouseId: mongoose.Types.ObjectId;
  lines: ITransferLine[];
  status: 'DRAFT' | 'APPROVED';
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransferLineSchema = new Schema<ITransferLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    // quantity directly in pieces
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const TransferSchema = new Schema<ITransfer>(
  {
    fromWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },
    toWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },
    lines: { type: [TransferLineSchema], default: [] },
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED'],
      default: 'DRAFT'
    },
    remarks: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model<ITransfer>('Transfer', TransferSchema);
