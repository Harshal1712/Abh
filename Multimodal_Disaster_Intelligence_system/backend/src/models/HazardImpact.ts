import mongoose, { Schema, Document } from 'mongoose';

export interface IHazardImpact extends Document {
  alertId: string;
  hazardType: string;
  buildingCount: number;
  directlyAffectedBuildings: number;
  bufferedBuildings: number;
  schools: number;
  hospitals: number;
  clinics: number;
  fireStations: number;
  policeStations: number;
  shelters: number;
  affectedFacilities: any[];
  calculatedAt: Date;
  dataSource: string;
  methodologyVersion: string;
}

const HazardImpactSchema: Schema = new Schema({
  alertId: { type: String, required: true, unique: true },
  hazardType: { type: String, required: true },
  buildingCount: { type: Number, default: 0 },
  directlyAffectedBuildings: { type: Number, default: 0 },
  bufferedBuildings: { type: Number, default: 0 },
  schools: { type: Number, default: 0 },
  hospitals: { type: Number, default: 0 },
  clinics: { type: Number, default: 0 },
  fireStations: { type: Number, default: 0 },
  policeStations: { type: Number, default: 0 },
  shelters: { type: Number, default: 0 },
  affectedFacilities: [{ type: Schema.Types.Mixed }],
  calculatedAt: { type: Date, default: Date.now },
  dataSource: { type: String, default: 'OpenStreetMap (Overpass API)' },
  methodologyVersion: { type: String, default: '1.0' }
});

export const HazardImpact = mongoose.model<IHazardImpact>('HazardImpact', HazardImpactSchema);
