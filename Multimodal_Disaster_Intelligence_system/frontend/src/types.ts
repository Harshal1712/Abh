export type UserRole = 'EXPERT' | 'CITIZEN';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export type EventStatus = 
  | 'MONITORING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'ACTIVE_ALERT'
  | 'CLOSED'
  | 'REJECTED'
  | 'HOLD';

export type HazardType = 'FLOOD' | 'LANDSLIDE' | 'MULTI_HAZARD' | 'RIVER_OVERFLOW' | 'BLOCKED_ROAD' | 'INFRASTRUCTURE_DAMAGE';

export interface ContributingFactor {
  id: string;
  name: string;
  contribution: number; // percentage e.g. 34%
  value: string;
  status: RiskLevel;
  type: 'rainfall' | 'soil' | 'slope' | 'river' | 'history' | 'satellite';
}

export interface ImpactMetrics {
  exposedPopulation: number;
  highExposurePop: number;
  modExposurePop: number;
  lowExposurePop: number;
  roadsAffectedKm: number;
  criticalRoadSegments: number;
  criticalInfrastructureCount: number;
  settlementsInZone: number;
  bridgesExposed: number;
  hospitalsExposed: number;
  schoolsExposed: number;
  priorityScore: number; // e.g. 92
}

export interface HazardEvent {
  id: string;
  title: string;
  location: string;
  district: string;
  coordinates: { lat: number; lng: number };
  floodRisk: number; // percentage e.g. 91
  landslideRisk: number; // percentage e.g. 84
  confidence: number; // percentage e.g. 88
  combinedPriority: RiskLevel;
  status: EventStatus;
  primaryHazard: HazardType;
  lastUpdated: string;
  detectedAt: string;
  
  // Evidence metrics
  rainfall24h: number; // mm
  rainfall72h: number; // mm
  avgSlope?: number; // degrees
  riverDistance?: number; // meters
  
  // Soil Moisture Fields
  soilMoisture?: number; // m³/m³
  soilMoistureUnit?: string;
  soilMoistureSource?: string;
  soilMoistureDepth?: string;
  soilMoistureTimestamp?: string;
  historicalEventsCount: number;
  satelliteChangeDetected: boolean;
  
  // Machine Learning Telemetry
  baselineSusceptibility?: number;
  dynamicLandslideRisk?: number;
  recentRainfall?: Record<string, number>;
  forecastRainfall?: Record<string, number>;
  
  // Model Explainability
  featureImportance?: Record<string, number>;
  localContributions?: any;
  globalFeatureImportance?: any;
  riskFactorWeighting?: any;  
  // Sentinel-1 Fields
  sentinel1Change?: number;
  sentinel1VV?: number;
  sentinel1VH?: number;
  sentinel1CurrentDate?: string;
  sentinel1PreviousDate?: string;
  sentinel1Unit?: string;
  sentinel1Source?: string;
  
  modelName?: string;
  source?: string;
  
  // Flood Telemetry
  floodModel?: string;
  floodTimestamp?: string;
  floodRainfall7d?: number;
  floodSentinel1VV?: number;
  floodSentinel1VH?: number;
  floodSentinel1VVChange?: number;
  floodSentinel1VHChange?: number;
  floodSentinel1CurrentDate?: string;
  floodSentinel1PreviousDate?: string;
  floodDEM?: number;
  floodSlope?: number;
  
  aiExplanation: string;
  
  contributingFactors: ContributingFactor[];
  impact: ImpactMetrics;
  
  timeline: {
    time: string;
    label: string;
    description: string;
    actor: 'AI' | 'EXPERT' | 'SYSTEM' | 'CITIZEN';
  }[];
  
  // Phase 7 Integration Fields
  estimatedBuildingsAffected?: number;
  affectedSchools?: number;
  affectedHospitals?: number;
  trafficStatus?: string;
  alternativeRouteAvailable?: boolean;
}

export interface CommunityAlert {
  id: string;
  eventId: string;
  title: string;
  affectedArea: string;
  hazardType: string;
  severity: RiskLevel;
  status: 'PENDING_PUBLISH' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'READY_TO_SEND' | 'SENDING' | 'SENT' | 'PARTIAL' | 'FAILED';
  messageEn: string;
  messageHi: string;
  messageLocal: string;
  selectedLanguage: 'en' | 'hi' | 'local';
  issuedAt?: string;
  expiresAt: string;
  approvedBy: string;
  verifiedByExpert: boolean;
  channels?: {
    whatsapp: boolean;
    email: boolean;
  };
  deliveryStats?: {
    whatsapp: { sent: number; failed: number };
    email: { sent: number; failed: number };
  };
  failureReasons?: string[];
  
  // Phase 7 Integration Fields
  estimatedBuildingsAffected?: number;
  affectedSchools?: number;
  affectedHospitals?: number;
  trafficStatus?: string;
  alternativeRouteAvailable?: boolean;
}

export interface CommunityReport {
  id: string;
  type: HazardType;
  location: string;
  district: string;
  coordinates?: { lat: number; lng: number };
  exifLocation?: { lat: number; lng: number };
  severity: RiskLevel;
  timestamp: string;
  description: string;
  photoUrl?: string;
  status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
  reporterId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface DataSourceStatus {
  name: string;
  type: string;
  connected: boolean;
  lastSync: string;
  frequency: string;
  statusText: string;
}

export interface RiskThresholds {
  flood: { critical: number; high: number; moderate: number; low: number };
  landslide: { critical: number; high: number; moderate: number; low: number };
  expertApprovalRequired: boolean;
  communityReportAutoVerify: boolean;
}
