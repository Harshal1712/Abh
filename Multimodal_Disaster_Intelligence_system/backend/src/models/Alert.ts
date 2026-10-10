import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  alertId: string;
  eventId?: mongoose.Types.ObjectId;
  title?: string;
  area?: string;
  hazardType: string;
  severity: string;
  location: string;
  geometry: any; // danger zone polygon
  affectedRoads: any[];
  alternativeRoute: any;
  travelAdvisory: string;
  weatherSummary: any;
  safetyInstructions: string;
  shelterRecommendation?: string;
  routeAdvice?: string;
  status: 'APPROVED' | 'EXPIRED' | 'REVOKED';
  public: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date;
  expiresAt?: Date;
}

const AlertSchema: Schema = new Schema({
  alertId: { type: String, required: true, unique: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'RiskEvent' },
  title: { type: String },
  area: { type: String },
  hazardType: { type: String, required: true },
  severity: { type: String, required: true },
  location: { type: String, required: true },
  geometry: { type: Schema.Types.Mixed },
  affectedRoads: [{ type: Schema.Types.Mixed }],
  alternativeRoute: { type: Schema.Types.Mixed },
  travelAdvisory: { type: String },
  weatherSummary: { type: Schema.Types.Mixed },
  safetyInstructions: { type: String },
  shelterRecommendation: { type: String },
  routeAdvice: { type: String },
  status: { 
    type: String, 
    enum: ['APPROVED', 'EXPIRED', 'REVOKED'],
    default: 'APPROVED'
  },
  public: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  approvedAt: { type: Date },
  expiresAt: { type: Date }
}, {
  timestamps: true
});

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
