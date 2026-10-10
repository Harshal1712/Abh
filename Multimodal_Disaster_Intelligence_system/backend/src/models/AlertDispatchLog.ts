import mongoose, { Schema, Document } from 'mongoose';

export interface IAlertDispatchLog extends Document {
  alertId: string;
  title: string;
  severity: string;
  targetArea: string;
  recipientEmail: string;
  recipientName: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING';
  channel: 'EMAIL' | 'PUSH' | 'SMS';
  providerMessageId?: string;
  sentAt: Date;
}

const AlertDispatchLogSchema: Schema = new Schema(
  {
    alertId: { type: String, required: true },
    title: { type: String, required: true },
    severity: { type: String, required: true },
    targetArea: { type: String, required: true },
    recipientEmail: { type: String, required: true },
    recipientName: { type: String, required: true },
    status: { type: String, enum: ['DELIVERED', 'FAILED', 'PENDING'], default: 'DELIVERED' },
    channel: { type: String, default: 'EMAIL' },
    providerMessageId: { type: String },
    sentAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const AlertDispatchLog = mongoose.model<IAlertDispatchLog>('AlertDispatchLog', AlertDispatchLogSchema);
