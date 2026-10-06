import mongoose, { Schema, Document } from 'mongoose';

export interface IImpactAssessment extends Document {
  riskEventId: mongoose.Types.ObjectId;
  peopleExposed: number;
  roadsExposedKm: number;
  buildingsExposed: number;
  priorityScore: number;
  createdAt: Date;
}

const ImpactAssessmentSchema: Schema = new Schema({
  riskEventId: { type: Schema.Types.ObjectId, ref: 'RiskEvent', required: true },
  peopleExposed: { type: Number, required: true },
  roadsExposedKm: { type: Number, required: true },
  buildingsExposed: { type: Number, required: true },
  priorityScore: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const ImpactAssessment = mongoose.model<IImpactAssessment>('ImpactAssessment', ImpactAssessmentSchema);
