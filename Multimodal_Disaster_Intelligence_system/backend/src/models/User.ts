import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  area: string;
  role: 'CITIZEN' | 'FIRST_RESPONDER' | 'DISPATCHER' | 'ADMIN';
  emailAlertsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: '' },
    area: { type: String, required: true, default: 'Kamrup' },
    role: {
      type: String,
      enum: ['CITIZEN', 'FIRST_RESPONDER', 'DISPATCHER', 'ADMIN'],
      default: 'CITIZEN',
    },
    emailAlertsEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
