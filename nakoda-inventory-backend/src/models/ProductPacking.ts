import mongoose, { Schema, Document } from 'mongoose';

export type PackingType = 'PIECE';

export interface IProductPacking extends Document {
  productId: mongoose.Types.ObjectId;
  type: PackingType;        // always "PIECE"
  unitName: string;         // e.g. "PCS"
  conversionToBase: number; // always 1
  isDefault: boolean;       // always true for the single unit
}

const ProductPackingSchema = new Schema<IProductPacking>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },

    // only one allowed type now
    type: { type: String, enum: ['PIECE'], required: true, default: 'PIECE' },

    // keep unitName just for display ("PCS", "Piece", etc.)
    unitName: { type: String, required: true, default: 'PCS' },

    // since base unit is piece, conversion is always 1
    conversionToBase: { type: Number, required: true, default: 1 },

    // always default, because there is only one packing type
    isDefault: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<IProductPacking>('ProductPacking', ProductPackingSchema);
