import mongoose, { Schema, Document } from 'mongoose';

export interface IDispatchLine {
  productId: mongoose.Types.ObjectId;
  quantity: number;         // pieces
  sellingPrice?: number;
}

export interface IDispatch extends Document {
  warehouseId: mongoose.Types.ObjectId;
  partyName?: string;
  dispatchType: 'SALE' | 'SAMPLE' | 'INTERNAL_USE';
  status: 'DRAFT' | 'APPROVED';
  lines: IDispatchLine[];
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
}

const DispatchLineSchema = new Schema<IDispatchLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },

    // quantity is now directly in pieces
    quantity: { type: Number, required: true, min: 1 },

    sellingPrice: Number
  },
  { _id: false }
);

const DispatchSchema = new Schema<IDispatch>(
  {
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    partyName: String,
    dispatchType: { type: String, enum: ['SALE', 'SAMPLE', 'INTERNAL_USE'], default: 'SALE' },
    status: { type: String, enum: ['DRAFT', 'APPROVED'], default: 'DRAFT' },
    lines: [DispatchLineSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export default mongoose.model<IDispatch>('Dispatch', DispatchSchema);
