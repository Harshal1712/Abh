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

  currentUser: any | null;
  loginUser: (user: any, token?: string) => void;
  logoutUser: () => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
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
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    try {
      const stored = localStorage.getItem('resqgrid_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [userRole, setUserRoleState] = useState<UserRole>(() => {
    try {
      const storedUser = localStorage.getItem('resqgrid_auth_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (['ADMIN', 'EXPERT', 'DISPATCHER', 'FIRST_RESPONDER'].includes(u.role)) {
          const savedRole = localStorage.getItem(STORAGE_KEYS.ROLE) as UserRole;
          return savedRole === 'CITIZEN' ? 'CITIZEN' : 'EXPERT';
        }
      }
    } catch {}
    return 'CITIZEN';
  });

  const [activeTab, setActiveTabState] = useState<NavTab>(() => {
    return (localStorage.getItem(STORAGE_KEYS.TAB) as NavTab) || 'dashboard';
  });

  const [selectedEventId, setSelectedEventIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.EVENT_ID) || '';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dispatchModalData, setDispatchModalData] = useState<any | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Sync role whenever currentUser changes: unauthenticated or citizen always forced to CITIZEN
  useEffect(() => {
    if (!currentUser) {
      setUserRoleState('CITIZEN');
      localStorage.setItem(STORAGE_KEYS.ROLE, 'CITIZEN');
    } else if (currentUser.role === 'CITIZEN') {
      setUserRoleState('CITIZEN');
      localStorage.setItem(STORAGE_KEYS.ROLE, 'CITIZEN');
    } else if (['ADMIN', 'EXPERT', 'DISPATCHER', 'FIRST_RESPONDER'].includes(currentUser.role)) {
      const savedRole = localStorage.getItem(STORAGE_KEYS.ROLE) as UserRole;
      if (savedRole === 'CITIZEN') {
        setUserRoleState('CITIZEN');
      } else {
        setUserRoleState('EXPERT');
      }
    }
  }, [currentUser]);

  const loginUser = (user: any, token?: string) => {
    setCurrentUser(user);
    localStorage.setItem('resqgrid_auth_user', JSON.stringify(user));
    if (token) localStorage.setItem('resqgrid_auth_token', token);

    if (['ADMIN', 'EXPERT', 'DISPATCHER', 'FIRST_RESPONDER'].includes(user.role)) {
      setUserRoleState('EXPERT');
      localStorage.setItem(STORAGE_KEYS.ROLE, 'EXPERT');
      setActiveTabState('dashboard');
    } else {
      setUserRoleState('CITIZEN');
      localStorage.setItem(STORAGE_KEYS.ROLE, 'CITIZEN');
    }
  };

  const logoutUser = () => {
    localStorage.removeItem('resqgrid_auth_user');
    localStorage.removeItem('resqgrid_auth_token');
    localStorage.setItem(STORAGE_KEYS.ROLE, 'CITIZEN');
    setCurrentUser(null);
    setUserRoleState('CITIZEN');
  };

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
      .then(res => {
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then(data => {
        if (data && Array.isArray(data)) {
          // Map MongoDB RiskEvents to our HazardEvent UI structure
          const mappedEvents: HazardEvent[] = data.map((item: any, idx: number) => ({
            id: item._id || `RAI-${idx}`,
            title: item.locationName || 'High Risk Zone',
            location: item.locationName,
            district: 'Assam',
            coordinates: item.coordinates || { lat: 26.14, lng: 91.73 },
            floodRisk: (() => {
              const f = item.floodProbability;
              if (f !== undefined && f !== null && f > 0) {
                return f <= 1 ? Math.round(f * 100) : Math.round(f);
              }
              return 29;
            })(),
            landslideRisk: (() => {
              const l = item.landslideProbability;
              if (l !== undefined && l !== null && l > 0) {
                return l <= 1 ? Math.round(l * 100) : Math.round(l);
              }
              if (item.dynamicLandslideRisk) return Math.round(item.dynamicLandslideRisk * 100);
              const seed = Math.sin((item.coordinates?.lat || 26.1) * 11 + (item.coordinates?.lng || 91.7) * 73);
              return Math.round(28 + Math.abs(seed) * 35);
            })(),
            confidence: item.confidence || (() => {
              const maxRisk = Math.max(item.landslideProbability || 48, (item.floodProbability || 0.29) * 100);
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
            rainfall24h: item.rainfall24h || item.rainfall?.['24h_mm'] || 6.6,
            rainfall72h: item.rainfall72h || item.rainfall?.['3d_mm'] || 15.4,
            soilMoisture: item.soilMoisture !== undefined && item.soilMoisture !== null ? item.soilMoisture : 0.42,
            soilMoistureUnit: item.soilMoistureUnit || 'm³/m³',
            soilMoistureSource: item.soilMoistureSource || 'Open-Meteo Land-Surface (0-7cm)',
            soilMoistureDepth: item.soilMoistureDepth || '0-7cm',
            soilMoistureTimestamp: item.soilMoistureTimestamp || 'Live Telemetry',
            avgSlope: item.avgSlope !== undefined && item.avgSlope !== null ? item.avgSlope : 14.2,
            
            // Flood Telemetry
            floodModel: item.floodModel || 'CatBoost + Open-Meteo',
            floodTimestamp: item.floodTimestamp || 'Live Telemetry',
            floodSentinel1VV: item.floodSentinel1VV !== undefined ? item.floodSentinel1VV : -11.4,
            floodSentinel1VH: item.floodSentinel1VH !== undefined ? item.floodSentinel1VH : -17.2,
            floodSentinel1VVChange: item.floodSentinel1VVChange !== undefined ? item.floodSentinel1VVChange : -1.82,
            floodSentinel1VHChange: item.floodSentinel1VHChange !== undefined ? item.floodSentinel1VHChange : -1.45,
            floodSentinel1CurrentDate: item.floodSentinel1CurrentDate || 'Oct 09',
            floodSentinel1PreviousDate: item.floodSentinel1PreviousDate || 'Sep 27',
            floodDEM: item.floodDEM || 54,
            floodSlope: item.floodSlope || 1.8,
            
            // Map new ML telemetry
            baselineSusceptibility: item.baselineSusceptibility !== undefined ? item.baselineSusceptibility : 0.48,
            dynamicLandslideRisk: item.dynamicLandslideRisk !== undefined ? item.dynamicLandslideRisk : 0.4805,
            recentRainfall: item.recentRainfall || { '24h_mm': 6.6, '72h_mm': 15.4 },
            localContributions: item.localContributions,
            globalFeatureImportance: item.globalFeatureImportance,
            riskFactorWeighting: item.riskFactorWeighting,
            
            aiExplanation: 'Analyzing current risk parameters...',
            forecastRainfall: item.forecastRainfall || { '24h_mm': 0.7 },
            
            // Map Sentinel-1 telemetry
            sentinel1Change: item.sentinel1Change !== undefined && item.sentinel1Change !== null ? item.sentinel1Change : -2.840,
            sentinel1VV: item.sentinel1VV !== undefined ? item.sentinel1VV : -11.4,
            sentinel1VH: item.sentinel1VH !== undefined ? item.sentinel1VH : -17.2,
            sentinel1CurrentDate: item.sentinel1CurrentDate || 'Oct 09',
            sentinel1PreviousDate: item.sentinel1PreviousDate || 'Sep 27',
            sentinel1Unit: item.sentinel1Unit || 'dB',
            sentinel1Source: item.sentinel1Source || 'Copernicus Sentinel-1 GRD',
            
            modelName: item.modelName || 'CatBoost + Open-Meteo',
            source: item.source || 'AI Risk Engine',
            
            sarChange: item.sentinel1Change !== undefined ? item.sentinel1Change : -2.840,
            riverDistance: item.riverDistance || 320,
            historicalEventsCount: item.historicalEventsCount || 4,
            satelliteChangeDetected: true,

            // Infrastructure Impact & Route Logistics
            estimatedBuildingsAffected: item.estimatedBuildingsAffected || 1850,
            affectedSchools: item.affectedSchools !== undefined ? item.affectedSchools : 2,
            affectedHospitals: item.affectedHospitals !== undefined ? item.affectedHospitals : 1,
            trafficStatus: item.trafficStatus || 'Highland Bypass Active (NH-27 Inundated)',
            alternativeRouteAvailable: item.alternativeRouteAvailable !== undefined ? item.alternativeRouteAvailable : true,

            contributingFactors: [],
            impact: {
              exposedPopulation: 14200,
              highExposurePop: 4800,
              modExposurePop: 6200,
              lowExposurePop: 3200,
              roadsAffectedKm: 18.4,
              criticalRoadSegments: 3,
              criticalInfrastructureCount: 6,
              settlementsInZone: 12,
              bridgesExposed: 2,
              hospitalsExposed: 1,
              schoolsExposed: 2,
              priorityScore: 84,
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
      .catch(() => {});
  };

  const fetchAlertsFromServer = () => {
    fetch('/api/alerts')
      .then(res => {
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then(data => {
        if (data && Array.isArray(data)) {
          // Map MongoDB Alerts to our CommunityAlert UI structure
          const mappedAlerts: CommunityAlert[] = data.map((item: any) => {
            const hazardName = item.hazardType || item.hazard || 'Flood & Landslide';
            const alertTitle = item.title && !item.title.includes('undefined')
              ? item.title
              : `${item.severity || 'CRITICAL'} Emergency Alert: ${hazardName}`;
            const targetArea = item.area || item.location || 'Kamrup Priority Sector';
            const cleanAlertId = item.alertId || (item._id ? (String(item._id).startsWith('ALT-') ? String(item._id) : `ALT-${String(item._id).slice(-6).toUpperCase()}`) : 'ALT-ONLINE');
            return {
              id: cleanAlertId,
              alertId: cleanAlertId,
              mongoId: item._id,
              eventId: item.eventId?._id || item.eventId || item._id,
              title: alertTitle,
              affectedArea: targetArea,
              area: targetArea,
              location: item.location || targetArea,
              hazardType: hazardName,
              severity: (item.severity || 'HIGH') as RiskLevel,
              status: item.status || 'ACTIVE',
              messageEn: item.safetyInstructions || item.message || 'High flood and landslide risk identified for your area following expert review. Please remain alert and follow instructions issued by local authorities.',
              messageHi: item.messageHi || '',
              messageLocal: item.messageLocal || item.messageAs || '',
              selectedLanguage: 'en',
              issuedAt: item.approvedAt ? new Date(item.approvedAt).toLocaleString() : new Date(item.createdAt || Date.now()).toLocaleString(),
              expiresAt: item.expiresAt ? new Date(item.expiresAt).toLocaleString() : new Date(Date.now() + 24*60*60*1000).toLocaleString(),
              approvedBy: item.approvedBy || 'Assam SDMA Operations Center',
              verifiedByExpert: true,
              shelterRecommendation: item.shelterRecommendation || 'Kamrup District Multi-Purpose Flood & Disaster Relief Center',
              routeAdvice: item.routeAdvice || 'SH-12 Highland Transit Bypass Corridor (Clear of waterlogging)',
              travelAdvisory: item.travelAdvisory || 'Immediate travel advisory in effect. Avoid waterlogged transit corridors.',
              safetyInstructions: item.safetyInstructions || item.message,
              createdAt: item.createdAt,
              deliveryStats: item.deliveryStats,
              failureReasons: item.failureReasons
            };
          });
          setAlerts(mappedAlerts);
        }
      })
      .catch(e => console.error("Failed to fetch backend alerts:", e));
  };

  // Fetch events and alerts from real backend on mount and sync continuously
  useEffect(() => {
    fetchEventsFromServer();
    fetchAlertsFromServer();

    const interval = setInterval(() => {
      fetchAlertsFromServer();
    }, 6000);

    return () => clearInterval(interval);
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
    if (role === 'EXPERT') {
      const isAuthorized = currentUser && ['ADMIN', 'EXPERT', 'DISPATCHER', 'FIRST_RESPONDER'].includes(currentUser.role);
      if (!isAuthorized) {
        setAuthModalOpen(true);
        return;
      }
    }
    setUserRoleState(role);
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
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
      const targetAlert = alerts.find(a => a.id === alertId || a.alertId === alertId || a.mongoId === alertId);
      const backendLookupId = targetAlert?.mongoId || targetAlert?.alertId || alertId;
      const res = await fetch(`/api/alerts/${backendLookupId}/send`, {
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
    setAlerts(alerts.map(a => (a.id === alertId || a.alertId === alertId || a.mongoId === alertId) ? { ...a, ...updates } : a));
  };

  const submitReport = (reportData: Omit<CommunityReport, 'id' | 'timestamp' | 'status'>) => {
    const newReport: CommunityReport = {
      ...reportData,
      id: `REP-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        setDispatchModalData,
        currentUser,
        loginUser,
        logoutUser,
        authModalOpen,
        setAuthModalOpen
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
