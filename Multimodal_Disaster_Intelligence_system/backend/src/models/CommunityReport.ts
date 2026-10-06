import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunityReport extends Document {
  locationName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  reportType: string; // e.g., 'FLOODING', 'LANDSLIDE', 'BLOCKED_ROAD'
  description: string;
  status: 'PENDING_VALIDATION' | 'VERIFIED' | 'REJECTED';
  imageUrl?: string;
  reporterPhone?: string;
  matchedRiskEventId?: string;
  createdAt: Date;
}

const CommunityReportSchema: Schema = new Schema({
  locationName: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  reportType: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['PENDING_VALIDATION', 'VERIFIED', 'REJECTED'],
    default: 'PENDING_VALIDATION'
  },
  imageUrl: { type: String },
  reporterPhone: { type: String },
  matchedRiskEventId: { type: Schema.Types.ObjectId, ref: 'RiskEvent' },
  createdAt: { type: Date, default: Date.now }
});

export const CommunityReport = mongoose.model<ICommunityReport>('CommunityReport', CommunityReportSchema);
