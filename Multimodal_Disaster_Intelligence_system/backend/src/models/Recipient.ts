import mongoose, { Schema, Document } from 'mongoose';

export interface IRecipient extends Document {
  name: string;
  phone: string;
  email: string;
  district: string;
  latitude?: number;
  longitude?: number;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  isActive: boolean;
  consentStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecipientSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  district: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  whatsappEnabled: { type: Boolean, default: true },
  emailEnabled: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  consentStatus: { type: String, default: 'GRANTED' },
}, {
  timestamps: true
});

export const Recipient = mongoose.model<IRecipient>('Recipient', RecipientSchema);
