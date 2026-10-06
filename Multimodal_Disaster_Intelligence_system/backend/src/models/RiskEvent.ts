import mongoose, { Schema, Document } from 'mongoose';

export interface IRiskEvent extends Document {
  locationName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  polygon: any; // GeoJSON or simple representation
  // Phase 1: Landslide fields
  landslideProbability?: number;
  landslideModel?: string;
  landslideTimestamp?: Date;

  // Phase 2: Flood fields
  floodProbability?: number;
  floodModel?: string;
  floodTimestamp?: Date;
  floodRainfall1d?: number;
  floodRainfall3d?: number;
  floodRainfall7d?: number;
  floodSentinel1VV?: number;
  floodSentinel1VH?: number;
  floodSentinel1VVChange?: number;
  floodSentinel1VHChange?: number;
  floodSentinel1CurrentDate?: string;
  floodSentinel1PreviousDate?: string;
  floodDEM?: number;
  floodSlope?: number;
  combinedRisk: string; // e.g., 'CRITICAL', 'HIGH'
  severity: string;
  confidence: number;
  timeWindow: string; // e.g., 'Next 6-24 hours'
  status: 'PENDING_REVIEW' | 'APPROVED' | 'HOLD' | 'REJECTED';
  createdAt: Date;
  
  // Alert fields
  alertEligible?: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  approvalReason?: string;
  
  // New fields for dynamic AI Risk
  baselineSusceptibility?: number;
  dynamicLandslideRisk?: number;
  rainfall24h?: number;
  rainfall72h?: number;
  recentRainfall?: any;
  forecastRainfall?: any;
  avgSlope?: number;
  
  // Sentinel-1 Fields
  sentinel1Change?: number;
  sentinel1VV?: number;
  sentinel1VH?: number;
  sentinel1CurrentDate?: string;
  sentinel1PreviousDate?: string;
  sentinel1Unit?: string;
  sentinel1Source?: string;
  
  // Soil Moisture Fields
  soilMoisture?: number;
  soilMoistureUnit?: string;
  soilMoistureSource?: string;
  soilMoistureDepth?: string;
  soilMoistureTimestamp?: string;
  
  modelName?: string;
  source?: string; // AI generated or Citizen reported
  
  // Model Explainability
  localContributions?: any;
  globalFeatureImportance?: any;
  riskFactorWeighting?: any;
}

const RiskEventSchema: Schema = new Schema({
  locationName: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  polygon: { type: Schema.Types.Mixed },
  landslideProbability: { type: Number },
  landslideModel: { type: String },
  landslideTimestamp: { type: Date },

  floodProbability: { type: Number },
  floodModel: { type: String },
  floodTimestamp: { type: Date },
  floodRainfall1d: { type: Number },
  floodRainfall3d: { type: Number },
  floodRainfall7d: { type: Number },
  floodSentinel1VV: { type: Number },
  floodSentinel1VH: { type: Number },
  floodSentinel1VVChange: { type: Number },
  floodSentinel1VHChange: { type: Number },
  floodSentinel1CurrentDate: { type: String },
  floodSentinel1PreviousDate: { type: String },
  floodDEM: { type: Number },
  floodSlope: { type: Number },
  combinedRisk: { type: String, required: true },
  severity: { type: String, required: true },
  confidence: { type: Number, required: false },
  timeWindow: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['PENDING_REVIEW', 'APPROVED', 'HOLD', 'REJECTED'],
    default: 'PENDING_REVIEW'
  },
  createdAt: { type: Date, default: Date.now },
  
  // Alert fields
  alertEligible: { type: Boolean, default: false },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  approvalReason: { type: String },
  
  // Real data fields
  baselineSusceptibility: { type: Number },
  dynamicLandslideRisk: { type: Number },
  rainfall24h: { type: Number },
  rainfall72h: { type: Number },
  recentRainfall: { type: Schema.Types.Mixed },
  forecastRainfall: { type: Schema.Types.Mixed },
  avgSlope: { type: Number },
  
  // Sentinel-1 Fields
  sentinel1Change: { type: Number },
  sentinel1VV: { type: Number },
  sentinel1VH: { type: Number },
  sentinel1CurrentDate: { type: String },
  sentinel1PreviousDate: { type: String },
  sentinel1Unit: { type: String },
  sentinel1Source: { type: String },
  
  // Soil Moisture Fields
  soilMoisture: { type: Number },
  soilMoistureUnit: { type: String },
  soilMoistureSource: { type: String },
  soilMoistureDepth: { type: String },
  soilMoistureTimestamp: { type: String },
  
  modelName: { type: String, default: 'CatBoost + Open-Meteo' },
  source: { type: String, default: 'AI Risk Engine' },
  
  // Model Explainability
  localContributions: { type: Schema.Types.Mixed },
  globalFeatureImportance: { type: Schema.Types.Mixed },
  riskFactorWeighting: { type: Schema.Types.Mixed }
});

export const RiskEvent = mongoose.model<IRiskEvent>('RiskEvent', RiskEventSchema);
