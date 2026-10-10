import type { HazardEvent, CommunityAlert, CommunityReport, DataSourceStatus, RiskThresholds } from '../types';

export const INITIAL_EVENTS: HazardEvent[] = [];

export const INITIAL_ALERTS: CommunityAlert[] = [];

export const INITIAL_COMMUNITY_REPORTS: CommunityReport[] = [
  {
    id: 'REP-742',
    type: 'FLOOD',
    location: 'Bharalumukh Ghat, Guwahati',
    district: 'Kamrup Metro',
    coordinates: { lat: 26.1844, lng: 91.7458 },
    exifLocation: { lat: 26.1841, lng: 91.7455 },
    severity: 'CRITICAL',
    timestamp: 'Today, 11:32 AM',
    description: 'Brahmaputra embankment overflow reaching riverside residential lane. Water level is chest-deep, 4 vehicles submerged, 12 families stranded requiring boat evacuation.',
    photoUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
    status: 'UNVERIFIED',
    reporterId: 'USR-891',
    aiAnalysis: {
      isValid: true,
      confidence: 94,
      label: 'GENUINE HAZARD',
      reasoning: 'Visual analysis confirmed high-density turbid floodwater (76% silt/water hue density) and deep urban submergence. NLP corroborated urgent rescue distress indicators ("chest-deep", "stranded", "embankment breach"). Corroborated with active Guwahati rainfall telemetry.',
      recommendation: 'ACCEPT',
      detectedFeatures: [
        'Turbid Silt/Mud Flood Spectrum (76%)',
        'Distress Vocabulary: "chest-deep", "stranded", "embankment"',
        'Open Floodwater Inundation Profile (62%)',
        'Assam SDMA Active Risk Zone Match (Kamrup Metro)'
      ],
      analyzedAt: '11:32 AM',
      environmentalMatchScore: 92
    }
  },
  {
    id: 'REP-581',
    type: 'LANDSLIDE',
    location: 'Khanapara Hill Corridor, NH-27',
    district: 'Kamrup Metro',
    coordinates: { lat: 26.1158, lng: 91.8214 },
    exifLocation: { lat: 26.1160, lng: 91.8212 },
    severity: 'HIGH',
    timestamp: 'Today, 10:48 AM',
    description: 'Major slope failure and rockfall debris caved in across NH-27 eastbound transit lane. Two boulders blocking passage, heavy mud slurry descending from hill.',
    photoUrl: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80',
    status: 'UNVERIFIED',
    reporterId: 'USR-402',
    aiAnalysis: {
      isValid: true,
      confidence: 88,
      label: 'GENUINE HAZARD',
      reasoning: 'Visual analysis confirmed hillside rockfall and clay debris slurry (64% silt/slope pixel density). NLP corroborated road obstruction and slope instability terms ("rockfall", "debris caved in", "boulders blocking passage").',
      recommendation: 'ACCEPT',
      detectedFeatures: [
        'Slope Mud Debris Slurry Spectrum (64%)',
        'Distress Vocabulary: "slope failure", "rockfall", "blocking"',
        'Submerged Riparian & Hillside Terrain Context (28%)',
        'Assam SDMA Active Risk Zone Match (Kamrup Metro)'
      ],
      analyzedAt: '10:48 AM',
      environmentalMatchScore: 90
    }
  },
  {
    id: 'REP-319',
    type: 'BLOCKED_ROAD',
    location: 'Dispur Supermarket Area',
    district: 'Kamrup Metro',
    coordinates: { lat: 26.1408, lng: 91.7902 },
    severity: 'LOW',
    timestamp: 'Today, 09:15 AM',
    description: 'Minor puddle on pedestrian sidewalk after slight drizzle. Traffic is completely normal, just testing mobile submission.',
    status: 'UNVERIFIED',
    reporterId: 'USR-105',
    aiAnalysis: {
      isValid: false,
      confidence: 22,
      label: 'SUSPICIOUS / LOW RELEVANCE',
      reasoning: 'Visual and textual analysis identified non-crisis conditions (puddle only, 8% sediment density). NLP detected negative spam marker ("testing mobile submission") and normal traffic conditions. Recommended for rejection.',
      recommendation: 'REJECT',
      detectedFeatures: [
        'Low Hazard Feature Density (8%)',
        'Non-Crisis Text Context ("minor puddle", "just testing")',
        'Normal Traffic Status Reported'
      ],
      analyzedAt: '09:15 AM',
      environmentalMatchScore: 40
    }
  }
];

export const INITIAL_DATA_SOURCES: DataSourceStatus[] = [
  { name: 'CatBoost Model', type: 'Historical ML Classifier', connected: true, lastSync: 'Real-time', frequency: 'On-demand', statusText: 'Normal Operation' },
  { name: 'Baseline Raster', type: '1.92GB GeoTIFF', connected: true, lastSync: 'Loaded', frequency: 'Static', statusText: 'Loaded' },
  { name: 'Open-Meteo', type: 'Rainfall & Soil Moisture Telemetry', connected: true, lastSync: 'Live', frequency: '15 min cache', statusText: 'Normal Operation' },
  { name: 'MongoDB', type: 'Document Store', connected: true, lastSync: 'Live', frequency: 'Real-time', statusText: 'Connected' },
  { name: 'Sentinel-1', type: 'Synthetic Aperture Radar', connected: false, lastSync: 'N/A', frequency: 'N/A', statusText: 'CURRENTLY UNAVAILABLE' },
  { name: 'Flood Model', type: 'CatBoost Multi-Modal', connected: true, lastSync: 'Real-time', frequency: 'On-demand', statusText: 'CONNECTED' }
];

export const INITIAL_THRESHOLD_SETTINGS: RiskThresholds = {
  flood: { critical: 90, high: 70, moderate: 40, low: 0 },
  landslide: { critical: 80, high: 60, moderate: 40, low: 20 },
  expertApprovalRequired: true,
  communityReportAutoVerify: false
};

