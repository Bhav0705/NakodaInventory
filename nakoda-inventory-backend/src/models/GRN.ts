import mongoose, { Schema, Document } from 'mongoose';

export interface IGRNLine {
  productId: mongoose.Types.ObjectId;
  quantity: number;          // pieces
  purchasePrice?: number;
}

export interface IGRN extends Document {
  warehouseId: mongoose.Types.ObjectId;
  supplierName?: string;
  supplierInvoiceNo?: string;
  invoiceDate?: Date;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  lines: IGRNLine[];
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
}

const GRNLineSchema = new Schema<IGRNLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },

    // direct pieces quantity
    quantity: { type: Number, required: true, min: 1 },

    purchasePrice: Number
  },
  { _id: false }
);

const GRNSchema = new Schema<IGRN>(
  {
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    supplierName: String,
    supplierInvoiceNo: String,
    invoiceDate: Date,
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'APPROVED'],
      default: 'DRAFT'
    },
    lines: [GRNLineSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export default mongoose.model<IGRN>('GRN', GRNSchema);
