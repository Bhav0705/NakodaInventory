// src/models/Transfer.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITransferLine {
  productId: mongoose.Types.ObjectId;
  packingType: 'LOOSE' | 'KATTA' | 'MASTER' | 'OTHER';
  quantity: number;       // units in that packing (e.g. 10 katta)
  quantityBase: number;   // pcs after conversion
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
    packingType: {
      type: String,
      enum: ['LOOSE', 'KATTA', 'MASTER', 'OTHER'],
      default: 'LOOSE',
    },
    quantity: { type: Number, required: true },
    quantityBase: { type: Number, required: true }, // always pcs
  },
  { _id: false }
);

const TransferSchema = new Schema<ITransfer>(
  {
    fromWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    toWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    lines: { type: [TransferLineSchema], default: [] },
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED'],
      default: 'DRAFT',
    },
    remarks: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model<ITransfer>('Transfer', TransferSchema);
