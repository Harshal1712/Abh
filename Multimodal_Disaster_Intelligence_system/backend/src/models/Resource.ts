import mongoose, { Schema, Document } from 'mongoose';

export type ResourceType = 'AMBULANCE' | 'RESCUE_TEAM' | 'HOSPITAL' | 'SHELTER' | 'RESCUE_BOAT';
export type ResourceStatus = 'AVAILABLE' | 'DISPATCHED' | 'EN_ROUTE' | 'BUSY' | 'MAINTENANCE';

export interface IResource extends Document {
  resourceId: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  location: {
    name: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  contact: string;
  capacity?: number;
  currentOccupancy?: number;
  assignedIncident?: string | null;
  assignedTarget?: {
    lat: number;
    lng: number;
    name?: string;
  } | null;
  speedKmh: number;
  equipment: string[];
  deployedAt?: Date | null;
  etaMinutes?: number | null;
}

const ResourceSchema = new Schema<IResource>({
  resourceId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['AMBULANCE', 'RESCUE_TEAM', 'HOSPITAL', 'SHELTER', 'RESCUE_BOAT'],
    required: true,
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'BUSY', 'MAINTENANCE'],
    default: 'AVAILABLE',
  },
  location: {
    name: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  contact: { type: String, default: '108 / 112' },
  capacity: { type: Number, default: 0 },
  currentOccupancy: { type: Number, default: 0 },
  assignedIncident: { type: String, default: null },
  assignedTarget: {
    lat: { type: Number },
    lng: { type: Number },
    name: { type: String },
  },
  speedKmh: { type: Number, default: 45 },
  equipment: [{ type: String }],
  deployedAt: { type: Date, default: null },
  etaMinutes: { type: Number, default: null },
}, { timestamps: true });

export const Resource = mongoose.model<IResource>('Resource', ResourceSchema);
