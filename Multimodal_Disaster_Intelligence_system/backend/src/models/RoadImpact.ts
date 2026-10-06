import mongoose, { Schema, Document } from 'mongoose';

export interface IRoadImpact extends Document {
  roadId: string;
  roadName: string;
  status: 'NORMAL' | 'AT_RISK' | 'AFFECTED' | 'CLOSED';
  hazardId: string; // the RiskEvent or Alert ID causing this
  reason: string;
  geometry: any;
  roadType: string;
  accessibility: string;
  updatedAt: Date;
}

const RoadImpactSchema: Schema = new Schema({
  roadId: { type: String, required: true },
  roadName: { type: String },
  status: { 
    type: String, 
    enum: ['NORMAL', 'AT_RISK', 'AFFECTED', 'CLOSED'],
    default: 'AFFECTED'
  },
  hazardId: { type: String, required: true },
  reason: { type: String },
  geometry: { type: Schema.Types.Mixed },
  roadType: { type: String },
  accessibility: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

export const RoadImpact = mongoose.model<IRoadImpact>('RoadImpact', RoadImpactSchema);
