import mongoose, { Schema, Document } from 'mongoose';

export type SalesStatus = 'DRAFT' | 'APPROVED' | 'CANCELLED';

export interface ISalesItem {
  productId: mongoose.Types.ObjectId;

  quantity: number; 
  rate: number;     

  discount: number; 
  taxableAmount: number;

  taxPercent: number; 
  taxAmount: number;

  lineTotal: number; 
}


export interface ISalesInvoice extends Document {
  invoiceNo: string;
  customerId?: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;

  items: ISalesItem[];

  subTotal: number;     
  discountTotal: number; 
  taxableTotal: number;  
  taxTotal: number;      
  grandTotal: number;    

  paidAmount: number;
  dueAmount: number;

  status: SalesStatus;

  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
}


const SalesItemSchema = new Schema<ISalesItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },

    quantity: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },

    discount: { type: Number, default: 0, min: 0 },
    taxableAmount: { type: Number, required: true, min: 0 },

    taxPercent: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },

    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);


const SalesInvoiceSchema = new Schema<ISalesInvoice>(
  {
    invoiceNo: { type: String, required: true, unique: true },

    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },

    items: { type: [SalesItemSchema], required: true },

subTotal: { type: Number, required: true, min: 0 },
discountTotal: { type: Number, required: true, min: 0 },
taxableTotal: { type: Number, required: true, min: 0 },
taxTotal: { type: Number, required: true, min: 0 },
grandTotal: { type: Number, required: true, min: 0 },
paidAmount: { type: Number, default: 0, min: 0 },
dueAmount: { type: Number, required: true, min: 0 },



    status: { type: String, enum: ['DRAFT', 'APPROVED', 'CANCELLED'], default: 'DRAFT' },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);
SalesInvoiceSchema.index({ status: 1, createdAt: -1 });
SalesInvoiceSchema.index({ warehouseId: 1, createdAt: -1 });
SalesInvoiceSchema.index({ customerId: 1, createdAt: -1 });


export default mongoose.model<ISalesInvoice>('SalesInvoice', SalesInvoiceSchema);
