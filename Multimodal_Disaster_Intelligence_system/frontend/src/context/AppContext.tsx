import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  UserRole,
  HazardEvent,
  CommunityAlert,
  CommunityReport,
  DataSourceStatus,
  RiskThresholds,
  RiskLevel
} from '../types';
import {
  INITIAL_EVENTS,
  INITIAL_ALERTS,
  INITIAL_COMMUNITY_REPORTS,
  INITIAL_DATA_SOURCES,
  INITIAL_THRESHOLD_SETTINGS
} from '../data/initialData';

export type NavTab =
  | 'dashboard'
  | 'active-events'
  | 'ai-risk'
  | 'expert-review'
  | 'alert-management'
  | 'community-reports'
  | 'settings'
  | 'event-detail';

interface AppContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;

  events: HazardEvent[];
  alerts: CommunityAlert[];
  communityReports: CommunityReport[];
  dataSources: DataSourceStatus[];
  thresholds: RiskThresholds;

  // Computed helpers
  selectedEvent: HazardEvent | undefined;

  // State Mutation Actions
  approveEvent: (eventId: string, options?: { title?: string; severity?: RiskLevel; messageEn?: string }) => void;
  publishAlert: (alertId: string, isTest?: boolean) => void;
  holdEvent: (eventId: string) => void;
  rejectEvent: (eventId: string, reason?: string) => void;
  updateAlertContent: (alertId: string, updates: Partial<CommunityAlert>) => void;

  submitReport: (report: Omit<CommunityReport, 'id' | 'timestamp' | 'status'>) => void;
  verifyReport: (reportId: string) => void;
  rejectReport: (reportId: string) => void;

  updateThresholds: (thresholds: RiskThresholds) => void;
  resetDemoData: () => void;
  createRiskEvent: (data: any) => Promise<void>;

  dispatchModalData: any | null;
  setDispatchModalData: (data: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROLE: 'geovision_role',
  TAB: 'geovision_tab',
  EVENT_ID: 'geovision_selected_event',
  EVENTS: 'geovision_events',
  ALERTS: 'geovision_alerts',
  REPORTS: 'geovision_reports',
  THRESHOLDS: 'geovision_thresholds'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem(STORAGE_KEYS.ROLE) as UserRole) || 'EXPERT';
  });

  const [activeTab, setActiveTabState] = useState<NavTab>(() => {
    return (localStorage.getItem(STORAGE_KEYS.TAB) as NavTab) || 'dashboard';
  });

  const [selectedEventId, setSelectedEventIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.EVENT_ID) || '';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dispatchModalData, setDispatchModalData] = useState<any | null>(null);

  const [events, setEvents] = useState<HazardEvent[]>(() => {
    return INITIAL_EVENTS;
  });

  const [alerts, setAlerts] = useState<CommunityAlert[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ALERTS);
    return saved ? JSON.parse(saved) : INITIAL_ALERTS;
  });

  const [communityReports, setCommunityReports] = useState<CommunityReport[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REPORTS);
    return saved ? JSON.parse(saved) : INITIAL_COMMUNITY_REPORTS;
  });

  const [dataSources] = useState<DataSourceStatus[]>(INITIAL_DATA_SOURCES);

  const [thresholds, setThresholds] = useState<RiskThresholds>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THRESHOLDS);
    return saved ? JSON.parse(saved) : INITIAL_THRESHOLD_SETTINGS;
  });

  // Sync to local storage for some states, but not for events and alerts anymore
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TAB, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EVENT_ID, selectedEventId);
  }, [selectedEventId]);

  const fetchEventsFromServer = () => {
    fetch('/api/risk')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          // Map MongoDB RiskEvents to our HazardEvent UI structure
          const mappedEvents: HazardEvent[] = data.map((item: any, idx: number) => ({
            id: item._id || `RAI-${idx}`,
            title: item.locationName || 'High Risk Zone',
            location: item.locationName,
            district: 'Assam',
            coordinates: item.coordinates || { lat: 26.14, lng: 91.73 },
            floodRisk: item.floodProbability !== undefined && item.floodProbability !== null ? Math.round(item.floodProbability * 100) : 0,
            landslideRisk: item.landslideProbability || 0,
            confidence: item.confidence || (() => {
              const maxRisk = Math.max(item.landslideProbability || 0, (item.floodProbability || 0) * 100);
              if (maxRisk > 85) return 94;
              if (maxRisk > 60) return 88;
              if (maxRisk < 20) return 91;
              return 82;
            })(),
            combinedPriority: item.combinedRisk as RiskLevel || 'HIGH',
            status: item.status || 'PENDING_REVIEW',
            primaryHazard: (item.floodProbability !== undefined && item.floodProbability !== null) ? 'MULTI_HAZARD' : 'LANDSLIDE',
            lastUpdated: new Date(item.createdAt).toLocaleTimeString(),
            detectedAt: new Date(item.createdAt).toLocaleString(),
            rainfall24h: item.rainfall24h || item.rainfall?.['24h_mm'] || 0,
            rainfall72h: item.rainfall72h || item.rainfall?.['3d_mm'] || 0,
            soilMoisture: item.soilMoisture,
            soilMoistureUnit: item.soilMoistureUnit,
            soilMoistureSource: item.soilMoistureSource,
            soilMoistureDepth: item.soilMoistureDepth,
            soilMoistureTimestamp: item.soilMoistureTimestamp,
            avgSlope: item.avgSlope !== undefined ? item.avgSlope : undefined,
            
            // Flood Telemetry
            floodModel: item.floodModel,
            floodTimestamp: item.floodTimestamp,
            floodSentinel1VV: item.floodSentinel1VV,
            floodSentinel1VH: item.floodSentinel1VH,
            floodSentinel1VVChange: item.floodSentinel1VVChange,
            floodSentinel1VHChange: item.floodSentinel1VHChange,
            floodSentinel1CurrentDate: item.floodSentinel1CurrentDate,
            floodSentinel1PreviousDate: item.floodSentinel1PreviousDate,
            floodDEM: item.floodDEM,
            floodSlope: item.floodSlope,
            
            // Map new ML telemetry
            baselineSusceptibility: item.baselineSusceptibility,
            dynamicLandslideRisk: item.dynamicLandslideRisk,
            recentRainfall: item.recentRainfall,
            localContributions: item.localContributions,
            globalFeatureImportance: item.globalFeatureImportance,
            riskFactorWeighting: item.riskFactorWeighting,
            
            aiExplanation: 'Analyzing current risk parameters...',
            forecastRainfall: item.forecastRainfall,
            
            // Map Sentinel-1 telemetry
            sentinel1Change: item.sentinel1Change,
            sentinel1VV: item.sentinel1VV,
            sentinel1VH: item.sentinel1VH,
            sentinel1CurrentDate: item.sentinel1CurrentDate,
            sentinel1PreviousDate: item.sentinel1PreviousDate,
            sentinel1Unit: item.sentinel1Unit,
            sentinel1Source: item.sentinel1Source,
            
            modelName: item.modelName,
            source: item.source,
            
            sarChange: item.sentinel1Change !== undefined ? item.sentinel1Change : (item.sar?.change !== undefined ? item.sar.change : undefined),
            riverDistance: undefined, // Unavailable
            historicalEventsCount: 0,
            satelliteChangeDetected: false,

            contributingFactors: [],
            impact: {
              exposedPopulation: 0,
              highExposurePop: 0,
              modExposurePop: 0,
              lowExposurePop: 0,
              roadsAffectedKm: 0,
              criticalRoadSegments: 0,
              criticalInfrastructureCount: 0,
              settlementsInZone: 0,
              bridgesExposed: 0,
              hospitalsExposed: 0,
              schoolsExposed: 0,
              priorityScore: 0,
            },
            timeline: [
              {
                time: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                label: 'Risk Event Generated',
                description: 'Initial risk event logged based on automated model threshold triggers and multi-modal pipeline data.',
                actor: 'AI' as const
              }
            ]
          }));
          setEvents(mappedEvents);
        }
      })
      .catch(e => console.error("Failed to fetch backend events:", e));
  };

  const fetchAlertsFromServer = () => {
    fetch('/api/alerts')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          // Map MongoDB Alerts to our CommunityAlert UI structure
          const mappedAlerts: CommunityAlert[] = data.map((item: any) => ({
            id: item._id,
            eventId: item.eventId?._id || item.eventId,
            title: `${item.severity} ${item.hazard} Alert`,
            affectedArea: item.location,
            hazardType: item.hazard,
            severity: item.severity as RiskLevel,
            status: item.status,
            messageEn: item.message,
            messageHi: '',
            messageLocal: '',
            selectedLanguage: 'en',
            expiresAt: new Date(Date.now() + 24*60*60*1000).toLocaleString(), // rough expiry
            approvedBy: item.approvedBy || 'System',
            verifiedByExpert: true,
            deliveryStats: item.deliveryStats,
            failureReasons: item.failureReasons
          }));
          setAlerts(mappedAlerts);
        }
      })
      .catch(e => console.error("Failed to fetch backend alerts:", e));
  };

  // Fetch events and alerts from real backend on mount
  useEffect(() => {
    fetchEventsFromServer();
    fetchAlertsFromServer();
  }, []);

  const createRiskEvent = async (data: any) => {
    try {
      const res = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        fetchEventsFromServer(); // refresh events
      }
    } catch (error) {
      console.error('Failed to create risk event', error);
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(communityReports));
  }, [communityReports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THRESHOLDS, JSON.stringify(thresholds));
  }, [thresholds]);

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
  };

  const setActiveTab = (tab: NavTab) => {
    setActiveTabState(tab);
  };

  const setSelectedEventId = (id: string) => {
    setSelectedEventIdState(id);
  };

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

  const updateEventStatus = async (eventId: string, newStatus: string, reason?: string) => {
    try {
      const res = await fetch(`/api/risk/${eventId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason })
      });
      if (res.ok) {
        fetchEventsFromServer();
      }
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const approveEvent = async (eventId: string, options?: { title?: string; severity?: RiskLevel; messageEn?: string }) => {
    await updateEventStatus(eventId, 'APPROVED');
    const target = events.find(e => e.id === eventId);
    if (!target) return;

    // Create an alert on the backend
    try {
      const hazard = target.primaryHazard === 'MULTI_HAZARD' ? 'Flood + Landslide' : target.primaryHazard;
      const severity = options?.severity || target.combinedPriority;
      const messageEn = options?.messageEn || `⚠️ ASSAM ${hazard} RISK ALERT\n\nHazard: ${hazard}\nSeverity: ${severity}\nLocation: ${target.location}\nRisk Score: ${Math.max(target.floodRisk || 0, target.landslideRisk || 0)}%\n\nThis is a model-based risk alert generated by the Assam Multi-Hazard Risk Monitoring System. Please follow instructions from official disaster-management authorities and move to a safe location if advised.\nTime: ${new Date().toLocaleString()}`;
      
      const payload = {
        eventId,
        hazard,
        severity,
        location: target.location,
        message: messageEn,
        channels: { whatsapp: true, email: true },
        riskScore: Math.max(target.floodRisk || 0, target.landslideRisk || 0)
      };

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchAlertsFromServer();
      } else {
        const errData = await res.json();
        console.error('Failed to create alert:', errData);
      }
    } catch (e) {
      console.error('Network error creating alert:', e);
    }
  };

  const publishAlert = async (alertId: string, isTest: boolean = false) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'Dr. Ananya Sharma', isTest })
      });
      if (res.ok) {
        fetchAlertsFromServer();
      } else {
        const err = await res.json();
        alert(`Failed to publish alert: ${err.message || err.error}`);
      }
    } catch (e) {
      console.error('Error publishing alert:', e);
    }
  };

  const holdEvent = async (eventId: string) => {
    await updateEventStatus(eventId, 'HOLD');
  };

  const rejectEvent = async (eventId: string, reason?: string) => {
    await updateEventStatus(eventId, 'REJECTED', reason);
  };

  const updateAlertContent = (alertId: string, updates: Partial<CommunityAlert>) => {
    setAlerts(alerts.map(a => a.id === alertId ? { ...a, ...updates } : a));
  };

  const submitReport = (reportData: Omit<CommunityReport, 'id' | 'timestamp' | 'status'>) => {
    const newReport: CommunityReport = {
      ...reportData,
      id: `REP-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: '18 Aug 2026, 11:05 AM',
      status: 'UNVERIFIED'
    };

    const updatedReports = [newReport, ...communityReports];
    setCommunityReports(updatedReports);

    // If report is linked to an active event, add to timeline
    if (selectedEventId) {
      setEvents(events.map(e => {
        if (e.id === selectedEventId) {
          return {
            ...e,
            timeline: [
              ...e.timeline,
              {
                time: '11:05 AM',
                label: 'Ground Community Report Received',
                description: `Citizen submitted observation: "${newReport.description.substring(0, 60)}..."`,
                actor: 'CITIZEN' as const
              }
            ]
          };
        }
        return e;
      }));
    }
  };

  const verifyReport = (reportId: string) => {
    const reportToVerify = communityReports.find(r => r.id === reportId);
    const reviewTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const reviewDateTime = new Date().toLocaleString();

    setCommunityReports(communityReports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          status: 'VERIFIED' as const,
          reviewedBy: 'Dr. Ananya Sharma',
          reviewedAt: reviewDateTime
        };
      }
      return r;
    }));

    if (reportToVerify) {
      // 1. Create a public alert
      const newAlert: CommunityAlert = {
        id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
        eventId: selectedEventId || reportId,
        title: `Community Verified: ${reportToVerify.severity} ${reportToVerify.type.replace('_', ' ')}`,
        affectedArea: reportToVerify.location,
        hazardType: reportToVerify.type,
        severity: reportToVerify.severity,
        status: 'ACTIVE',
        messageEn: `Ground observation verified by expert. ${reportToVerify.description} Please stay cautious in ${reportToVerify.location}.`,
        messageHi: '',
        messageLocal: '',
        selectedLanguage: 'en',
        issuedAt: reviewDateTime,
        expiresAt: new Date(Date.now() + 24*60*60*1000).toLocaleString(),
        approvedBy: 'Dr. Ananya Sharma',
        verifiedByExpert: true,
        channels: { whatsapp: true, email: true },
        deliveryStats: {
          whatsapp: { sent: 1, failed: 0 },
          email: { sent: 1, failed: 0 }
        }
      };
      setAlerts(prevAlerts => [newAlert, ...prevAlerts]);

      // Fire off demo dispatch to backend (actually sends Twilio and Nodemailer)
      fetch('/api/community/demo-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hazardType: newAlert.hazardType,
          location: newAlert.affectedArea,
          message: newAlert.messageEn
        })
      }).catch(err => console.error("Error dispatching demo alert:", err));

      // 2. Show Custom Dispatch Modal
      setTimeout(() => {
        setDispatchModalData({
          reportId: reportId,
          alertId: newAlert.id,
          whatsappSent: 1542,
          emailSent: 4201,
          location: reportToVerify.district || reportToVerify.location
        });
      }, 500);
    }

    if (selectedEventId) {
      setEvents(events.map(e => {
        if (e.id === selectedEventId) {
          return {
            ...e,
            timeline: [
              ...e.timeline,
              {
                time: reviewTime,
                label: 'Ground Observation Expert Verified',
                description: `Field report ${reportId} cross-validated and logged into event ground truth index. WhatsApp & Email alerts dispatched.`,
                actor: 'EXPERT' as const
              }
            ]
          };
        }
        return e;
      }));
    }
  };

  const rejectReport = (reportId: string) => {
    setCommunityReports(communityReports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          status: 'REJECTED' as const,
          reviewedBy: 'Dr. Ananya Sharma',
          reviewedAt: '18 Aug 2026, 11:10 AM'
        };
      }
      return r;
    }));
  };

  const updateThresholds = (newThresholds: RiskThresholds) => {
    setThresholds(newThresholds);
  };

  const resetDemoData = async () => {
    try {
      await fetch('/api/risk/clear-all-events');
    } catch (e) {
      console.error('Failed to clear database on reset', e);
    }
    localStorage.clear();
    setEvents(INITIAL_EVENTS);
    setAlerts(INITIAL_ALERTS);
    setCommunityReports(INITIAL_COMMUNITY_REPORTS);
    setThresholds(INITIAL_THRESHOLD_SETTINGS);
    setSelectedEventIdState('');
    setActiveTabState('dashboard');
    setUserRoleState('EXPERT');
  };

  return (
    <AppContext.Provider
      value={{
        userRole,
        setUserRole,
        activeTab,
        setActiveTab,
        selectedEventId,
        setSelectedEventId,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        events,
        alerts,
        communityReports,
        dataSources,
        thresholds,
        selectedEvent,
        approveEvent,
        publishAlert,
        holdEvent,
        rejectEvent,
        updateAlertContent,
        submitReport,
        verifyReport,
        rejectReport,
        updateThresholds,
        resetDemoData,
        createRiskEvent,
        dispatchModalData,
        setDispatchModalData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
