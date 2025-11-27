import mongoose, { Schema, Document } from 'mongoose';

export type UserRole =
  | 'super_admin'
  | 'warehouse_admin'
  | 'warehouse_manager'
  | 'viewer';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  assignedWarehouses: mongoose.Types.ObjectId[];
  status: 'active' | 'inactive';
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['super_admin', 'warehouse_admin', 'warehouse_manager', 'viewer'],
      default: 'warehouse_manager'
    },

    assignedWarehouses: [{ type: Schema.Types.ObjectId, ref: 'Warehouse' }],

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
