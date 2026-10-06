import type { HazardEvent, CommunityAlert, CommunityReport, DataSourceStatus, RiskThresholds } from '../types';

export const INITIAL_EVENTS: HazardEvent[] = [];

export const INITIAL_ALERTS: CommunityAlert[] = [];

export const INITIAL_COMMUNITY_REPORTS: CommunityReport[] = [];

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

