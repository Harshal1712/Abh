import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, ArrowRight, Camera, CheckCircle2, Compass, Info, MapPin, CloudRain,
  Crosshair, AlertOctagon, Clock, ChevronRight, ShieldCheck, Route,
  User, LogOut, Shield, Volume2, VolumeX, PhoneCall, Sparkles, Brain, CheckCircle, XCircle,
  RefreshCw, Radio, Building2, Mountain, Navigation,
  ExternalLink, ShieldAlert, Truck, Languages
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AuthModal } from '../components/common/AuthModal';
import type { HazardType, RiskLevel, CommunityAlert, ReportAiAnalysis } from '../types';
import { validateCommunityReportClientSide } from '../utils/aiReportValidator';
import {
  type AlertLanguage,
  ALERT_LANGUAGES,
  getMultilingualAlertDetails,
  playAlertSpeechBroadcast,
  stopAlertSpeechBroadcast,
} from '../utils/multilingualAlerts';
import exifr from 'exifr';

// ==============================================================
// LOCATION & PROXIMITY TELEMETRY ENGINE
// ==============================================================

import {
  type AmbulanceResource,
  type ShelterResource,
  type RoadCorridor,
  type DemoLocation,
  DEMO_LOCATIONS,
  ASSAM_DISTRICTS,
  calculateDistanceKm,
  getDistrictIntelligence,
  getProximityResourcesForCoords,
} from '../data/districtIntelligence';

export type { AmbulanceResource, ShelterResource, RoadCorridor, DemoLocation };
export { DEMO_LOCATIONS, calculateDistanceKm, ASSAM_DISTRICTS };

export const CitizenPortalPage: React.FC = () => {
  const { alerts, submitReport, setUserRole, currentUser, logoutUser, authModalOpen, setAuthModalOpen } = useApp();
  
  const [activeTab, setActiveTab] = useState<'HOME' | 'ALERTS' | 'ROADS' | 'WEATHER' | 'REPORT'>('HOME');
  const [selectedAlert, setSelectedAlert] = useState<CommunityAlert | null>(null);
  
  // Audio Speech Warning State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioAlertId, setAudioAlertId] = useState<string | null>(null);
  const [audioAlertLang, setAudioAlertLang] = useState<AlertLanguage | null>(null);
  const [cardLangMap, setCardLangMap] = useState<Record<string, AlertLanguage>>({});

  // Form State for Report
  const [hazardType, setHazardType] = useState<HazardType>('FLOOD'); 
  const [severity, setSeverity] = useState<RiskLevel>('HIGH');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Darrang');
  const [location, setLocation] = useState('Darrang'); 
  const [description, setDescription] = useState('');
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [exifLocation, setExifLocation] = useState<{lat: number; lng: number} | undefined>(undefined);
  const [submitted, setSubmitted] = useState(false);

  // Client-Side AI State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiPreviewAnalysis, setAiPreviewAnalysis] = useState<ReportAiAnalysis | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter public alerts: prioritize active and approved alerts
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE' || a.status === 'APPROVED' || a.status === 'SENT');
  const displayAlerts = activeAlerts.length > 0 ? activeAlerts : alerts;

  // Proximity & Geolocation Coordinates State (Default to Darrang)
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 26.4358, lng: 92.0305 });
  const [locationMode, setLocationMode] = useState<'PRESET' | 'GPS' | 'MANUAL'>('PRESET');
  const [selectedDemoId, setSelectedDemoId] = useState<string>('darrang-mangaldai');
  const [manualLat, setManualLat] = useState<string>('26.4358');
  const [manualLng, setManualLng] = useState<string>('92.0305');
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>('Synchronized: Darrang District Center');
  const [landslideSimActive, setLandslideSimActive] = useState<boolean>(false);
  const [sosModalAmbulance, setSosModalAmbulance] = useState<AmbulanceResource | null>(null);
  const [sosSentToast, setSosSentToast] = useState<string | null>(null);
  const [selectedShelterModal, setSelectedShelterModal] = useState<ShelterResource | null>(null);

  // Dynamically compute localized Ambulances, Shelters, Roads & Landslide Havens
  const localizedData = useMemo(() => {
    return getProximityResourcesForCoords(coords, selectedDistrict || location);
  }, [coords, selectedDistrict, location]);

  const nearbyAmbulances = localizedData.ambulances;
  const nearbyShelters = localizedData.shelters;
  const landslideSafeHavens = localizedData.landslideSafeHavens;
  const nearbyRoads = localizedData.roads;
  const activeWeather = localizedData.weather;

  // Centralized District Switcher Handler - keeps coords, district, inputs, and resources synchronized
  const handleDistrictChange = (newDistrict: string) => {
    const intel = getDistrictIntelligence(newDistrict);
    setSelectedDistrict(intel.name);
    setLocation(intel.name);
    setCoords({ lat: intel.lat, lng: intel.lng });
    setManualLat(intel.lat.toFixed(4));
    setManualLng(intel.lng.toFixed(4));
    setLandslideSimActive(intel.isLandslideZone);
    setSelectedDemoId('');
    setGpsStatusMessage(`Sector locked: ${intel.name} (${intel.lat.toFixed(4)}°N, ${intel.lng.toFixed(4)}°E)`);
  };

  // Handle Live Device GPS Fetch
  const handleFetchLiveGps = () => {
    if (!navigator.geolocation) {
      setGpsStatusMessage('Geolocation not supported by this browser.');
      return;
    }
    setIsLocatingGps(true);
    setGpsStatusMessage('Acquiring satellite fix from device GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = parseFloat(pos.coords.latitude.toFixed(4));
        const newLng = parseFloat(pos.coords.longitude.toFixed(4));
        setCoords({ lat: newLat, lng: newLng });
        setManualLat(newLat.toString());
        setManualLng(newLng.toString());
        setLocationMode('GPS');
        setSelectedDemoId('');
        setLocation(`Live GPS Position (${newLat.toFixed(3)}°N, ${newLng.toFixed(3)}°E)`);
        setIsLocatingGps(false);
        setGpsStatusMessage(`Satellite GPS Locked: ±${Math.round(pos.coords.accuracy || 10)}m accuracy`);
      },
      (err) => {
        setIsLocatingGps(false);
        setGpsStatusMessage(`GPS access denied or timed out (${err.message}). Using current coordinates.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle Manual Coordinates Apply
  const handleApplyManualCoords = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const latNum = parseFloat(manualLat);
    const lngNum = parseFloat(manualLng);
    if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
      setCoords({ lat: latNum, lng: lngNum });
      setLocationMode('MANUAL');
      setSelectedDemoId('');
      setGpsStatusMessage(`Coordinates manually locked: ${latNum.toFixed(4)}°N, ${lngNum.toFixed(4)}°E`);
    } else {
      alert('Please enter valid numeric latitude (-90 to 90) and longitude (-180 to 180)');
    }
  };

  // Handle Demo Preset Selection
  const handleSelectDemoPreset = (preset: DemoLocation) => {
    handleDistrictChange(preset.district);
    setCoords({ lat: preset.lat, lng: preset.lng });
    setManualLat(preset.lat.toString());
    setManualLng(preset.lng.toString());
    setSelectedDemoId(preset.id);
    setLocationMode('PRESET');
    setGpsStatusMessage(`Simulating Sector: ${preset.name}`);
    if (preset.isLandslideZone) {
      setLandslideSimActive(true);
    }
  };

  // Trigger SOS Ambulance Dispatch
  const handleRequestSos = (ambulance: AmbulanceResource) => {
    setSosModalAmbulance(ambulance);
    setSosSentToast(`Dispatched ${ambulance.name} (Driver: ${ambulance.driverName}) to [${coords.lat}, ${coords.lng}]!`);
    setTimeout(() => setSosSentToast(null), 6000);
  };

  // Run Real-Time Client-Side AI Analysis when photo or description changes
  useEffect(() => {
    let isCancelled = false;
    const runAnalysis = async () => {
      if (!description.trim() && !selectedImageFile && !photoBlobUrl) {
        setAiPreviewAnalysis(null);
        return;
      }
      setIsAiAnalyzing(true);
      try {
        const result = await validateCommunityReportClientSide({
          description: description || 'Visual observation uploaded by citizen.',
          hazardType,
          location,
          district: location.includes('(') ? location.split('(')[1].replace(')', '') : location,
          image: selectedImageFile || photoBlobUrl || null,
          fileName: photoName || selectedImageFile?.name,
        });
        if (!isCancelled) {
          setAiPreviewAnalysis(result);
        }
      } catch (err) {
        console.error('Client-side AI analysis failed:', err);
      } finally {
        if (!isCancelled) {
          setIsAiAnalyzing(false);
        }
      }
    };

    const timer = setTimeout(runAnalysis, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [description, selectedImageFile, hazardType, location, photoBlobUrl, photoName]);

  // Clean up audio speech on unmount
  useEffect(() => {
    return () => {
      stopAlertSpeechBroadcast();
    };
  }, []);

  const handleSpeechBroadcast = (alertItem: CommunityAlert, lang: AlertLanguage = 'en') => {
    const alertKey = alertItem.alertId || alertItem.id;
    if (isPlayingAudio && audioAlertId === alertKey && audioAlertLang === lang) {
      stopAlertSpeechBroadcast();
      setIsPlayingAudio(false);
      setAudioAlertId(null);
      setAudioAlertLang(null);
      return;
    }

    playAlertSpeechBroadcast(alertItem, lang, {
      onStart: () => {
        setIsPlayingAudio(true);
        setAudioAlertId(alertKey);
        setAudioAlertLang(lang);
      },
      onEnd: () => {
        setIsPlayingAudio(false);
        setAudioAlertId(null);
        setAudioAlertLang(null);
      },
      onError: () => {
        setIsPlayingAudio(false);
        setAudioAlertId(null);
        setAudioAlertLang(null);
      },
    });
  };

  const handleStopSpeech = () => {
    stopAlertSpeechBroadcast();
    setIsPlayingAudio(false);
    setAudioAlertId(null);
    setAudioAlertLang(null);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setPhotoName(file.name);
      setPhotoBlobUrl(URL.createObjectURL(file));
      try {
        const gps = await exifr.gps(file);
        if (gps) {
          setExifLocation({ lat: gps.latitude, lng: gps.longitude });
          setLocation(`Photo GPS: ${gps.latitude.toFixed(3)}°N, ${gps.longitude.toFixed(3)}°E`);
        }
      } catch (err) {
        console.error('Error extracting EXIF data:', err);
      }
    }
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(3);
          const lng = pos.coords.longitude.toFixed(3);
          setLocation(`GPS: ${lat}°N, ${lng}°E (${selectedDistrict})`);
        },
        () => {
          setLocation(selectedDistrict);
        }
      );
    } else {
      setLocation(selectedDistrict);
    }
  };

  const submit = async (event: React.FormEvent) => { 
    event.preventDefault(); 
    
    // Ensure AI Analysis has completed
    let finalAiAnalysis = aiPreviewAnalysis;
    if (!finalAiAnalysis) {
      finalAiAnalysis = await validateCommunityReportClientSide({
        description: description || 'Local citizen observation reported via mobile app.',
        hazardType,
        location,
        image: selectedImageFile || photoBlobUrl || null,
        fileName: photoName || selectedImageFile?.name,
      });
    }

    let finalPhotoUrl = photoBlobUrl || undefined;

    // Upload to Cloudinary / Server storage if file is present
    if (selectedImageFile) {
      try {
        const formData = new FormData();
        formData.append('image', selectedImageFile);
        const uploadRes = await fetch('/api/community/upload-image', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.url) {
            finalPhotoUrl = uploadData.url;
          }
        }
      } catch (err) {
        console.warn('Image upload error:', err);
      }
    }

    submitReport({ 
      type: hazardType, 
      location, 
      district: selectedDistrict || (location.includes('(') ? location.split('(')[1].replace(')', '') : location), 
      severity, 
      description: description || 'Local citizen observation reported via mobile crisis app.', 
      photoUrl: finalPhotoUrl,
      exifLocation: exifLocation,
      aiAnalysis: finalAiAnalysis
    }); 

    setSubmitted(true); 
    setDescription(''); 
    setPhotoName(null); 
    setPhotoBlobUrl(null);
    setSelectedImageFile(null);
    setExifLocation(undefined);
    setAiPreviewAnalysis(null);
    setTimeout(() => setSubmitted(false), 5000); 
  };

  const getRiskBadgeStyles = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-300 ring-1 ring-orange-200';
      case 'MODERATE':
        return 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-200';
      case 'LOW':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  // ==============================================================
  // TAB RENDERING (CLEAN WHITE / LIGHT THEME)
  // ==============================================================

  const renderHome = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ============================================================== */}
      {/* 1. LOCATION INTELLIGENCE & GPS / MANUAL CONTROL CARD          */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        {/* Top Status Bar: Live Coordinates & Sector Telemetry */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm ring-4 ring-indigo-50">
              <Compass className="h-6 w-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Assam Civil Defense GPS Telemetry
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Triangulation Active
                </span>
                {(landslideSimActive || DEMO_LOCATIONS.find(d => d.id === selectedDemoId)?.isLandslideZone) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <Mountain className="h-3 w-3 text-rose-600" />
                    Mountain Slope / Landslide Sector
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-indigo-600 shrink-0" />
                  {location}
                </h2>
                <div className="flex items-center gap-1.5 sm:ml-3">
                  <span className="text-[11px] font-bold text-slate-500">Sector:</span>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition shadow-2xs"
                    title="Select any Assam District to immediately recalculate nearby emergency ambulances, shelters & safe routes"
                  >
                    {ASSAM_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap font-mono">
                <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-bold text-slate-800">
                  Lat: {coords.lat.toFixed(4)}°N, Lng: {coords.lng.toFixed(4)}°E
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 font-sans font-medium">
                  Elevation: <strong>{localizedData.elevation || '58m'}</strong>
                </span>
                {gpsStatusMessage && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="text-indigo-600 font-sans font-bold flex items-center gap-1">
                      <Radio className="h-3 w-3 animate-pulse" /> {gpsStatusMessage}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Location Mode Switch Tabs */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start lg:self-center">
            <button
              onClick={() => setLocationMode('PRESET')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition ${
                locationMode === 'PRESET'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Demo Hotspots
            </button>
            <button
              onClick={handleFetchLiveGps}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition ${
                locationMode === 'GPS'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crosshair className={`h-3.5 w-3.5 ${isLocatingGps ? 'animate-spin text-indigo-600' : 'text-emerald-600'}`} />
              {isLocatingGps ? 'Locking GPS...' : 'Fetch Live GPS'}
            </button>
            <button
              onClick={() => setLocationMode('MANUAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition ${
                locationMode === 'MANUAL'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Navigation className="h-3.5 w-3.5 text-sky-600" /> Manual Coordinates
            </button>
          </div>
        </div>

        {/* MODE A: DEMO PRESET SCENARIOS */}
        {locationMode === 'PRESET' && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Select High-Risk Disaster Hotspot (1-Click Simulation):
              </span>
              <span className="text-[11px] text-indigo-600 font-bold">
                Automatically recalculates ambulances, shelters & safe routes
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {DEMO_LOCATIONS.map((preset) => {
                const isSelected = selectedDemoId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectDemoPreset(preset)}
                    className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200 shadow-2xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black text-slate-900 line-clamp-1">{preset.name}</span>
                        {preset.isLandslideZone && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0">
                            Landslide Slope
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                        {preset.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/60 text-[10px] font-mono text-slate-500">
                      <span>{preset.lat}°N, {preset.lng}°E</span>
                      <span className="font-sans font-bold text-indigo-700">{preset.elevation} Elev</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* MODE B: LIVE GPS FETCHER */}
        {locationMode === 'GPS' && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <Crosshair className={`h-5 w-5 ${isLocatingGps ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <strong className="block text-xs font-black text-emerald-950">Device Hardware Geolocation</strong>
                <p className="text-xs text-emerald-800">
                  {gpsStatusMessage || 'Uses device GPS sensor and cellular triangulation to pinpoint your immediate position.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleFetchLiveGps}
              disabled={isLocatingGps}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-xs font-black text-white shadow-2xs transition flex items-center justify-center gap-2 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
              {isLocatingGps ? 'Acquiring Fix...' : 'Re-sync Device GPS'}
            </button>
          </div>
        )}

        {/* MODE C: MANUAL COORDINATES ENTRY */}
        {locationMode === 'MANUAL' && (
          <form onSubmit={handleApplyManualCoords} className="p-4 rounded-xl border border-sky-200 bg-sky-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                <Navigation className="h-4 w-4 text-sky-600" /> Enter Custom GPS Coordinates for Demo Testing:
              </span>
              <span className="text-[11px] text-sky-800 font-medium">Valid range: Lat -90 to 90, Lng -180 to 180</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Latitude (°N)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="e.g. 26.1340"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Longitude (°E)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="e.g. 91.8150"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Target District</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer"
                >
                  {ASSAM_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-2xs transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Apply Coordinates & Recalculate
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. DYNAMIC PROXIMITY GRID: AMBULANCES & SHELTERS               */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* PILLAR A: NEARBY AMBULANCES WITH DRIVER CONTACT */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Nearby Ambulances Fleet</h3>
                  <p className="text-[11px] text-slate-500">Live ALS units sorted by proximity to your coordinates</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                {nearbyAmbulances[0]?.distanceKm} km • ETA ~{nearbyAmbulances[0]?.etaMinutes}m
              </span>
            </div>

            {/* Featured Nearest Ambulance Hero Card */}
            {nearbyAmbulances[0] && (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-4 mb-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                      PRIMARY CLOSEST AMBULANCE
                    </span>
                    <h4 className="text-base font-black text-slate-900 mt-0.5">{nearbyAmbulances[0].name}</h4>
                    <span className="text-xs font-mono font-bold text-slate-600 block mt-0.5">
                      Plate: {nearbyAmbulances[0].vehicleNumber} • Base: {nearbyAmbulances[0].baseLocation}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-emerald-700 block">{nearbyAmbulances[0].distanceKm} km</span>
                    <span className="text-[10px] font-bold text-slate-500">ETA: ~{nearbyAmbulances[0].etaMinutes} mins</span>
                  </div>
                </div>

                {/* Driver Details Box */}
                <div className="my-3 p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-800 font-black text-xs border border-slate-200">
                      👨‍✈️
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Designated Pilot / Paramedic</span>
                      <strong className="text-sm font-black text-slate-900">{nearbyAmbulances[0].driverName}</strong>
                      <span className="text-xs font-mono font-bold text-indigo-700 block mt-0.5">
                        {nearbyAmbulances[0].driverPhone}
                      </span>
                    </div>
                  </div>

                  <a
                    href={`tel:${nearbyAmbulances[0].driverPhone}`}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-2xs shrink-0"
                  >
                    <PhoneCall className="h-3.5 w-3.5" /> Call Driver Now
                  </a>
                </div>

                {/* Equipment Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {nearbyAmbulances[0].equipment.slice(0, 3).map((eq, i) => (
                    <span key={i} className="text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                      ✓ {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Standby Ambulances List */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Additional Standby Fleet in Sector:
              </span>
              {nearbyAmbulances.slice(1, 3).map((amb) => (
                <div key={amb.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{amb.name}</span>
                    <span className="text-[11px] text-slate-500">
                      Driver: <strong>{amb.driverName}</strong> ({amb.driverPhone})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700 text-[11px]">{amb.distanceKm} km</span>
                    <a
                      href={`tel:${amb.driverPhone}`}
                      className="p-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 transition"
                      title="Call Driver"
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick SOS Dispatch Button */}
          {nearbyAmbulances[0] && (
            <button
              onClick={() => handleRequestSos(nearbyAmbulances[0])}
              className="mt-4 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition shadow-sm flex items-center justify-center gap-2 tracking-wide"
            >
              <AlertTriangle className="h-4 w-4" /> 🚨 Request SOS Ambulance Dispatch to My GPS ({coords.lat.toFixed(3)}, {coords.lng.toFixed(3)})
            </button>
          )}
        </div>

        {/* PILLAR B: NEARBY DESIGNATED SAFE SHELTERS */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Nearby Relief Shelters</h3>
                  <p className="text-[11px] text-slate-500">Evacuation havens with bed capacity & provisions</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Nearest: {nearbyShelters[0]?.distanceKm} km away
              </span>
            </div>

            {/* Featured Nearest Shelter Hero Card */}
            {nearbyShelters[0] && (
              <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-4 mb-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-sky-500" />
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                      PRIMARY SAFE DESTINATION
                    </span>
                    <h4 className="text-base font-black text-slate-900 mt-0.5">{nearbyShelters[0].name}</h4>
                    <span className="text-xs text-slate-600 block mt-0.5">
                      {nearbyShelters[0].locationName}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-indigo-700 block">{nearbyShelters[0].distanceKm} km</span>
                    <span className="text-[10px] font-bold text-slate-500">{nearbyShelters[0].elevationMeters}m Elevation</span>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="my-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-700">Available Bed Space:</span>
                    <strong className="text-emerald-700 font-mono font-black">
                      {nearbyShelters[0].capacity - nearbyShelters[0].occupied} / {nearbyShelters[0].capacity} Free Beds
                    </strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.round((nearbyShelters[0].occupied / nearbyShelters[0].capacity) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium">
                    <strong>Approach Route:</strong> {nearbyShelters[0].approachInstructions}
                  </p>
                </div>

                {/* Provisions Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {nearbyShelters[0].facilities.slice(0, 3).map((f, i) => (
                    <span key={i} className="text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Other Nearby Shelters */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Alternative Highland Shelters:
              </span>
              {nearbyShelters.slice(1, 3).map((sh) => (
                <div key={sh.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{sh.name}</span>
                    <span className="text-[11px] text-slate-500">
                      Free Beds: <strong>{sh.capacity - sh.occupied}</strong> • Elev: {sh.elevationMeters}m
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700 text-[11px]">{sh.distanceKm} km</span>
                    <button
                      onClick={() => setSelectedShelterModal(sh)}
                      className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 transition"
                      title="View Details"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {nearbyShelters[0] && (
            <button
              onClick={() => setSelectedShelterModal(nearbyShelters[0])}
              className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition shadow-sm flex items-center justify-center gap-2 tracking-wide"
            >
              <Navigation className="h-4 w-4" /> Get Step-by-Step Evacuation Route to Shelter ({nearbyShelters[0].distanceKm} km)
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. LANDSLIDE INTELLIGENCE: SAFE PLACE TO REACH IF LANDSLIDE   */}
      {/* ============================================================== */}
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-rose-50/50 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-amber-200/70">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-sm ring-4 ring-amber-100">
              <Mountain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  Landslide Threat & Slope Geological Telemetry
                </span>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                  Civil Defense Directive
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                Safe Places to Reach If Landslide Occurs in This Sector
              </h3>
            </div>
          </div>

          {/* Landslide Protocol Mode Toggle */}
          <button
            onClick={() => setLandslideSimActive(!landslideSimActive)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition border flex items-center gap-1.5 shrink-0 self-start sm:self-center ${
              landslideSimActive
                ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-200'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            {landslideSimActive ? '⚠️ Landslide Protocol Active' : 'Activate Landslide Evacuation Guide'}
          </button>
        </div>

        {/* Geological Directives Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Landslide Safe Havens List */}
          <div className="space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
              🏔️ Designated Bedrock High-Ground Havens (Non-Slip Foundations):
            </span>
            {landslideSafeHavens.slice(0, 2).map((haven) => (
              <div key={haven.id} className="p-3.5 rounded-xl border border-amber-200 bg-white shadow-2xs space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <strong className="text-xs font-black text-slate-900 block">{haven.name}</strong>
                    <span className="text-[11px] text-slate-500 block">{haven.locationName}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-amber-700 block">{haven.distanceKm} km</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {haven.elevationMeters}m Elev
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-700 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60 leading-relaxed">
                  <strong>Geological Safety:</strong> {haven.geologyNote}
                </div>
                <div className="text-[11px] text-slate-600 flex items-center gap-1 pt-0.5">
                  <Route className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span><strong>Safe Ridge Approach:</strong> {haven.approachInstructions}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Immediate Landslide Survival Rules */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-2.5 text-xs">
            <span className="font-black uppercase tracking-wider text-rose-900 text-[11px] block flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-600" /> Immediate Life-Saving Landslide Survival Directives:
            </span>
            <div className="space-y-2 text-rose-950 font-medium">
              <div className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-rose-200">
                <span className="text-red-600 font-black">🛑</span>
                <span>
                  <strong>AVOID GULLIES & RAVINES:</strong> Debris flows and saturated mud channel directly into stream beds and depressions. Never seek shelter downhill.
                </span>
              </div>
              <div className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-rose-200">
                <span className="text-emerald-700 font-black">🧭</span>
                <span>
                  <strong>RUN PERPENDICULAR TO SLIDE:</strong> If you hear ground rumbling, move across the slope away from the trajectory towards solid bedrock crests.
                </span>
              </div>
              <div className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-rose-200">
                <span className="text-indigo-700 font-black">🧱</span>
                <span>
                  <strong>IF TRAPPED INDOORS:</strong> Move to the upper floors away from outer slope walls. Curl into a ball under heavy furniture to protect your head.
                </span>
              </div>
            </div>
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Mountain Rescue Control:</span>
              <a href="tel:1070" className="font-black text-rose-700 hover:underline flex items-center gap-1">
                <PhoneCall className="h-3 w-3 text-rose-600" /> Call SDMA Hotline: 1070
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. REAL-TIME CORRIDOR PASSABILITY & ROAD STATUS               */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Nearby Transit Corridors & Road Passability</h3>
              <p className="text-[11px] text-slate-500">Real-time highway and evacuation road telemetry sorted by distance from current coordinates</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('ROADS')} 
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            All Corridors <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {nearbyRoads.slice(0, 4).map((road, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <strong className="text-xs font-black text-slate-900 block">{road.name}</strong>
                  <span className="text-[11px] text-slate-500">{road.distanceKm} km from your coordinates</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  road.status.includes('OPEN') ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  road.status.includes('CLOSED') ? 'bg-red-100 text-red-800 border border-red-300' :
                  'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {road.status}
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">{road.condition}</p>
              <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>Elevation: <strong>{road.elevation}</strong></span>
                <span className="text-indigo-700 font-bold">{road.safeForLandslide ? '✓ Safe Highland Axis' : '⚠️ Slope Drainage Watch'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TOP EMERGENCY FLASH BROADCAST CARD */}
      {displayAlerts.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 animate-bounce text-red-600" />
              Active Emergency Flash Alerts ({displayAlerts.length})
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-red-600 animate-pulse" /> SDMA Gateway Live
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {displayAlerts.map((alert) => {
              const alertKey = alert.alertId || alert.id;
              const currentLang = cardLangMap[alertKey] || 'en';
              const localized = getMultilingualAlertDetails(alert, currentLang);
              const isBroadcastingThis = isPlayingAudio && audioAlertId === alertKey;

              return (
                <div 
                  key={alertKey}
                  className="group relative overflow-hidden rounded-2xl border-2 border-red-200/90 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition"
                >
                  {/* Glowing alert accent */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-indigo-600" />

                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase border ${getRiskBadgeStyles(alert.severity)}`}>
                        <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                        {localized.severity} • {localized.hazardType}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 border border-slate-200 font-mono">
                        ID: {alertKey}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Text Language Switcher Pill */}
                      <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[10px] font-bold">
                        <span className="px-2 py-0.5 text-slate-400 flex items-center gap-1">
                          <Languages className="h-3 w-3" /> Lang:
                        </span>
                        {ALERT_LANGUAGES.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setCardLangMap(prev => ({ ...prev, [alertKey]: l.id }))}
                            className={`px-2 py-0.5 rounded-lg transition font-bold ${
                              currentLang === l.id
                                ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title={`Switch card text to ${l.label}`}
                          >
                            {l.flag} {l.native}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{alert.issuedAt || 'Active Now'}</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2 group-hover:text-red-600 transition">
                    {localized.title}
                  </h3>

                  <p className="text-sm font-medium leading-relaxed text-slate-700 mb-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                    {localized.message}
                  </p>

                  {/* Rich Emergency Details: Shelter, Route, Travel */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-emerald-900 flex items-start gap-2.5">
                      <Building2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black block uppercase tracking-wider text-[10px] text-emerald-800">Designated Safe Shelter</span>
                        <p className="font-bold text-emerald-950 mt-0.5">{localized.shelter}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-sky-900 flex items-start gap-2.5">
                      <Route className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black block uppercase tracking-wider text-[10px] text-sky-800">Recommended Evacuation Route</span>
                        <p className="font-bold text-sky-950 mt-0.5">{localized.route}</p>
                      </div>
                    </div>
                  </div>

                  {localized.travelAdvisory && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 mb-4 flex items-center gap-2">
                      <AlertOctagon className="h-4 w-4 text-amber-600 shrink-0" />
                      <span><strong>Transit Advisory:</strong> {localized.travelAdvisory}</span>
                    </div>
                  )}

                  {/* Active Broadcasting Status Indicator */}
                  {isBroadcastingThis && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700 animate-pulse shadow-xs">
                      <div className="flex items-center gap-2 font-black">
                        <Volume2 className="h-4 w-4 text-red-600 animate-bounce" />
                        <span>Audio Broadcast Active ({audioAlertLang === 'hi' ? '🇮🇳 हिन्दी (Hindi)' : audioAlertLang === 'as' ? '🌾 অসমীয়া (Assamese)' : '🇬🇧 English'})...</span>
                      </div>
                      <button
                        onClick={handleStopSpeech}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black transition flex items-center gap-1 shadow-sm"
                      >
                        <VolumeX className="h-3.5 w-3.5" /> Stop Siren
                      </button>
                    </div>
                  )}

                  {/* Card Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <MapPin className="h-4 w-4 text-red-500" />
                      <span>{alert.affectedArea || alert.location}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Multi-Language Listen Audio Warning Options */}
                      <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-black uppercase text-slate-500 px-2 flex items-center gap-1">
                          <Volume2 className="h-3.5 w-3.5 text-indigo-600" /> Listen:
                        </span>

                        {/* English audio button */}
                        <button
                          type="button"
                          onClick={() => handleSpeechBroadcast(alert, 'en')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                            isBroadcastingThis && audioAlertLang === 'en'
                              ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs'
                          }`}
                          title="Listen in English"
                        >
                          {isBroadcastingThis && audioAlertLang === 'en' ? (
                            <>
                              <VolumeX className="h-3 w-3" /> Stop EN
                            </>
                          ) : (
                            <>
                              <span>🇬🇧</span> English
                            </>
                          )}
                        </button>

                        {/* Hindi audio button */}
                        <button
                          type="button"
                          onClick={() => handleSpeechBroadcast(alert, 'hi')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                            isBroadcastingThis && audioAlertLang === 'hi'
                              ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs'
                          }`}
                          title="Listen in Hindi (हिन्दी)"
                        >
                          {isBroadcastingThis && audioAlertLang === 'hi' ? (
                            <>
                              <VolumeX className="h-3 w-3" /> Stop हिन्दी
                            </>
                          ) : (
                            <>
                              <span>🇮🇳</span> हिन्दी
                            </>
                          )}
                        </button>

                        {/* Assamese audio button */}
                        <button
                          type="button"
                          onClick={() => handleSpeechBroadcast(alert, 'as')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                            isBroadcastingThis && audioAlertLang === 'as'
                              ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs'
                          }`}
                          title="Listen in Assamese (অসমীয়া)"
                        >
                          {isBroadcastingThis && audioAlertLang === 'as' ? (
                            <>
                              <VolumeX className="h-3 w-3" /> Stop অসমীয়া
                            </>
                          ) : (
                            <>
                              <span>🌾</span> অসমীয়া
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
                      >
                        Full Advisory <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50 mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black text-emerald-950">No Active Emergency Alerts in {location}</h3>
          <p className="text-sm text-emerald-800 max-w-md mx-auto mt-1">
            Civilian corridors are presently operating normally. Continuous multi-modal telemetry monitoring remains active.
          </p>
        </div>
      )}

      {/* DUAL TELEMETRY SUMMARY: ROADS & WEATHER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Road Corridor Status */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Route className="h-4 w-4 text-indigo-600" /> Corridor Passability Status
            </h3>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {selectedDistrict} Sector Network
            </span>
          </div>

          <div className="space-y-2.5">
            {nearbyRoads.slice(0, 3).map((r, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{r.name}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      r.status.includes('CLOSED') ? 'bg-red-100 text-red-700' : 
                      r.status.includes('OPEN') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{r.condition}</p>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setActiveTab('ROADS')} 
            className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition py-2.5 rounded-xl bg-indigo-50/60 hover:bg-indigo-50"
          >
            Check all transit routes <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Doppler Weather & River Telemetry */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-indigo-600" /> Live Hydro-Meteorology
            </h3>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {selectedDistrict} Telemetry
            </span>
          </div>

          <div className="flex items-center justify-between mb-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <p className="text-3xl font-black text-slate-900">{activeWeather.temp}</p>
              <p className="text-xs font-bold text-indigo-700 mt-0.5">{activeWeather.condition}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <CloudRain className="h-7 w-7 text-indigo-600" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">24h Cumulative Rain</span>
              <span className="font-black text-slate-900 text-sm">{activeWeather.rainfall24h}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">{selectedDistrict} Basin Level</span>
              <span className="font-black text-red-600 text-sm">{activeWeather.riverLevel}</span>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('WEATHER')} 
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition py-2.5 rounded-xl bg-indigo-50/60 hover:bg-indigo-50"
          >
            View Doppler Telemetry <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* CITIZEN HAZARD REPORT CALL-TO-ACTION BANNER */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> AI-Assisted Ground Intelligence
          </span>
          <h3 className="text-lg font-black text-slate-900 mt-1">Witnessing floodwater, landslide, or road block?</h3>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Upload a photo with details. Our real-time client AI will inspect silt turbidity & text urgency to expedite emergency dispatch.
          </p>
        </div>
        <button 
          onClick={() => setActiveTab('REPORT')} 
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-3 text-xs font-black text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 shrink-0"
        >
          <Camera className="h-4 w-4" /> Report Hazard to SDMA
        </button>
      </div>
    </div>
  );

  const renderAlertsTab = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" /> Complete Crisis Bulletin Feed
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official emergency alerts published by the Assam Disaster Intelligence Center and validated by field analysts.
          </p>
        </div>
        <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
          Showing {displayAlerts.length} Active Alert(s)
        </span>
      </div>

      <div className="space-y-4">
        {displayAlerts.map((alert) => {
          const alertKey = alert.alertId || alert.id;
          const currentLang = cardLangMap[alertKey] || 'en';
          const localized = getMultilingualAlertDetails(alert, currentLang);
          const isBroadcastingThis = isPlayingAudio && audioAlertId === alertKey;

          return (
            <div 
              key={alertKey}
              className="rounded-2xl border-2 border-red-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-indigo-600" />

              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${getRiskBadgeStyles(alert.severity)}`}>
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                    {localized.severity} • {localized.hazardType}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 border border-slate-200 font-mono">
                    ID: {alertKey}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Language switch */}
                  <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[10px] font-bold">
                    <span className="px-2 py-0.5 text-slate-400 flex items-center gap-1">
                      <Languages className="h-3 w-3" /> Lang:
                    </span>
                    {ALERT_LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setCardLangMap(prev => ({ ...prev, [alertKey]: l.id }))}
                        className={`px-2 py-0.5 rounded-lg transition font-bold ${
                          currentLang === l.id
                            ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title={`Switch card text to ${l.label}`}
                      >
                        {l.flag} {l.native}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Issued: {alert.issuedAt || 'Active Now'}
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2">{localized.title}</h3>
              
              <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                {localized.message}
              </p>

              {/* Key Directive Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block mb-1">Target Sector</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" /> {alert.affectedArea || alert.location}
                  </span>
                </div>
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-1">Evacuation Shelter</span>
                  <span className="font-bold text-emerald-950 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {localized.shelter}
                  </span>
                </div>
                <div className="bg-sky-50 p-3.5 rounded-xl border border-sky-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 block mb-1">Safe Evacuation Route</span>
                  <span className="font-bold text-sky-950 flex items-center gap-1">
                    <Route className="h-3.5 w-3.5 text-sky-600 shrink-0" /> {localized.route}
                  </span>
                </div>
              </div>

              {/* Active Audio Broadcast Banner */}
              {isBroadcastingThis && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700 animate-pulse shadow-xs">
                  <div className="flex items-center gap-2 font-black">
                    <Volume2 className="h-4 w-4 text-red-600 animate-bounce" />
                    <span>Audio Broadcast Active ({audioAlertLang === 'hi' ? '🇮🇳 हिन्दी (Hindi)' : audioAlertLang === 'as' ? '🌾 অসমীয়া (Assamese)' : '🇬🇧 English'})...</span>
                  </div>
                  <button
                    onClick={handleStopSpeech}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black transition flex items-center gap-1 shadow-sm"
                  >
                    <VolumeX className="h-3.5 w-3.5" /> Stop Siren
                  </button>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Authorized By: <strong className="text-slate-800">{alert.approvedBy || 'Assam SDMA'}</strong>
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Multi-Language Listen Audio Warning Options */}
                  <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-500 px-2 flex items-center gap-1">
                      <Volume2 className="h-3.5 w-3.5 text-indigo-600" /> Listen:
                    </span>

                    {/* English */}
                    <button
                      type="button"
                      onClick={() => handleSpeechBroadcast(alert, 'en')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        isBroadcastingThis && audioAlertLang === 'en'
                          ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs'
                      }`}
                      title="Listen in English"
                    >
                      {isBroadcastingThis && audioAlertLang === 'en' ? (
                        <>
                          <VolumeX className="h-3 w-3" /> Stop EN
                        </>
                      ) : (
                        <>
                          <span>🇬🇧</span> English
                        </>
                      )}
                    </button>

                    {/* Hindi */}
                    <button
                      type="button"
                      onClick={() => handleSpeechBroadcast(alert, 'hi')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        isBroadcastingThis && audioAlertLang === 'hi'
                          ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs'
                      }`}
                      title="Listen in Hindi (हिन्दी)"
                    >
                      {isBroadcastingThis && audioAlertLang === 'hi' ? (
                        <>
                          <VolumeX className="h-3 w-3" /> Stop हिन्दी
                        </>
                      ) : (
                        <>
                          <span>🇮🇳</span> हिन्दी
                        </>
                      )}
                    </button>

                    {/* Assamese */}
                    <button
                      type="button"
                      onClick={() => handleSpeechBroadcast(alert, 'as')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        isBroadcastingThis && audioAlertLang === 'as'
                          ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs'
                      }`}
                      title="Listen in Assamese (অসমীয়া)"
                    >
                      {isBroadcastingThis && audioAlertLang === 'as' ? (
                        <>
                          <VolumeX className="h-3 w-3" /> Stop অসমীয়া
                        </>
                      ) : (
                        <>
                          <span>🌾</span> অসমীয়া
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedAlert(alert)}
                    className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
                  >
                    View Complete Details <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderRoadsTab = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Route className="h-5 w-5 text-indigo-600" /> Assam Highway & Corridor Status
        </h2>
        <p className="text-xs text-slate-500 mt-1">Real-time road passability telemetry validated against active flood inundations.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {nearbyRoads.map((road, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-black text-slate-900 text-base">{road.name}</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  road.status.includes('CLOSED') ? 'bg-red-100 text-red-700 border border-red-200' : 
                  road.status.includes('OPEN') ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                  'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {road.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {selectedDistrict} Corridor • {road.elevation} Elev
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> {road.condition}
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Distance</span>
              <span className="text-xs font-mono font-bold text-slate-700">{road.distanceKm} km away</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-900">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-amber-950 font-bold mb-0.5">Assam State Transport Advisory:</strong>
          Heavy vehicles and civilian cars are advised to strictly use elevated bypasses. Do not attempt to cross flooded roadways where water depth is unknown.
        </div>
      </div>
    </div>
  );

  const renderWeatherTab = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <CloudRain className="h-5 w-5 text-indigo-600" /> Doppler Radar & Rainfall Telemetry
        </h2>
        <p className="text-xs text-slate-500 mt-1">Multi-source satellite precipitation and river gauge readings for Assam basin.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{selectedDistrict} Surface Temperature</span>
            <p className="text-5xl font-black text-slate-900 mt-1">{activeWeather.temp}</p>
            <p className="text-sm font-bold text-indigo-600 mt-1">{activeWeather.condition}</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <CloudRain className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Rain Probability</span>
            <span className="text-2xl font-black text-slate-900">{activeWeather.rainProb}</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">24h Precipitation</span>
            <span className="text-2xl font-black text-slate-900">{activeWeather.rainfall24h}</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">{selectedDistrict} River Level</span>
            <span className="text-2xl font-black text-red-600">{activeWeather.riverLevel}</span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700">
          <strong className="block text-slate-900 font-bold mb-1">Official IMD Meteorological Bulletin:</strong>
          {activeWeather.forecast}
        </div>
      </div>
    </div>
  );

  const renderReportTab = () => (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-4 ring-indigo-50/50 mb-3">
          <Camera className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Citizen Ground Observation Report</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Submit observed disaster telemetry. Our real-time client-side AI analyzes photos and descriptions to prioritize validation for SDMA control.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5">
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
            1. Hazard Classification
          </label>
          <select 
            value={hazardType} 
            onChange={e => setHazardType(e.target.value as HazardType)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="FLOOD">Flash Flood & River Inundation</option>
            <option value="LANDSLIDE">Hill Slope Collapse / Landslide</option>
            <option value="BLOCKED_ROAD">Highway or Street Inundation / Blocked</option>
            <option value="RIVER_OVERFLOW">River Embankment Breach</option>
            <option value="INFRASTRUCTURE_DAMAGE">Bridge / Power Infrastructure Damage</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
            2. Observation Location
          </label>
          <div className="flex gap-2">
            <input 
              value={location} 
              onChange={e => setLocation(e.target.value)} 
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. Bharalumukh Ghat, Guwahati"
            />
            <button 
              type="button" 
              onClick={requestLocation} 
              title="Lock Current GPS"
              className="px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition"
            >
              <Crosshair className="h-5 w-5 text-indigo-600" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
            3. Ground Severity Assessment
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const).map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSeverity(lvl)}
                className={`py-2.5 rounded-xl text-xs font-black tracking-wider transition ${
                  severity === lvl
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
            4. Details & Current Situation
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what you see: water depth (knee/chest deep), stranded residents, damaged structures, road status..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
          />
        </div>

        {/* Photo Upload with client canvas analysis */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
            5. Upload Ground Photograph
          </label>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-slate-100 p-5 text-sm font-bold text-slate-700 transition"
          >
            <Camera className="h-5 w-5 text-indigo-600" />
            {photoName ? `Selected: ${photoName}` : 'Select or Take Real Photo (Live AI Verification)'}
          </button>

          {photoBlobUrl && (
            <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 max-h-48 flex items-center justify-center bg-slate-100">
              <img src={photoBlobUrl} alt="Upload preview" className="object-cover max-h-48 w-full" />
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-emerald-700 font-bold border border-emerald-300 flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="h-3 w-3" /> Photo Attached
              </div>
            </div>
          )}

          {exifLocation && (
            <div className="mt-2 text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              GPS Coordinates Extracted from Image: {exifLocation.lat.toFixed(4)}°N, {exifLocation.lng.toFixed(4)}°E
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* REAL-TIME CLIENT-SIDE AI SCANNER & RECOMMENDATION CARD         */}
        {/* ============================================================== */}
        {(isAiAnalyzing || aiPreviewAnalysis) && (
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-sky-50/50 to-white p-4.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-600 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                  Client-Side Neural Vision & NLP Analysis
                </span>
              </div>
              {isAiAnalyzing && (
                <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Scanning...
                </span>
              )}
            </div>

            {aiPreviewAnalysis && (
              <div className="space-y-2.5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 font-bold">AI Hazard Validity:</span>
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-md ${
                    aiPreviewAnalysis.isValid 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {aiPreviewAnalysis.label} ({aiPreviewAnalysis.confidence}% Confidence)
                  </span>
                </div>

                {/* Recommendation for Admin */}
                <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  aiPreviewAnalysis.recommendation === 'ACCEPT'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}>
                  {aiPreviewAnalysis.recommendation === 'ACCEPT' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                  )}
                  <span>
                    <strong>AI Recommendation to Admin:</strong> {aiPreviewAnalysis.recommendation === 'ACCEPT' ? 'ACCEPT EVENT' : 'REJECT EVENT'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-700 leading-relaxed bg-white/90 p-3 rounded-xl border border-slate-200">
                  {aiPreviewAnalysis.reasoning}
                </p>

                {aiPreviewAnalysis.detectedFeatures.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {aiPreviewAnalysis.detectedFeatures.map((feat, i) => (
                      <span key={i} className="text-[10px] bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold shadow-2xs">
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3.5 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5"
        >
          <Camera className="h-4 w-4" /> Submit Verified Report to Control Center
        </button>
      </form>
    </div>
  );

  const renderSosModal = () => {
    if (!sosModalAmbulance) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg rounded-2xl border-2 border-red-300 bg-white p-6 sm:p-7 shadow-2xl text-slate-800 my-8">
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-red-600 ring-4 ring-red-50">
                <Truck className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  EMERGENCY SOS DISPATCH CONFIRMED
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">Ambulance En Route to Your Coordinates</h3>
              </div>
            </div>
            <button
              onClick={() => setSosModalAmbulance(null)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 my-4 text-xs">
            {/* GPS Target Pill */}
            <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-950 font-mono">
              <div className="text-[10px] uppercase font-bold text-indigo-700 font-sans mb-1">
                Your Dispatched GPS Target:
              </div>
              <strong className="text-sm block">
                {coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°E ({location})
              </strong>
              <span className="text-[11px] font-sans text-indigo-800 mt-0.5 block">
                Transmitted via Assam SDMA Emergency Radio Link • High Priority Dispatch
              </span>
            </div>

            {/* Dispatched Unit Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Assigned Vehicle:</span>
                <strong className="text-slate-900 font-bold">{sosModalAmbulance.name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Vehicle Plate:</span>
                <strong className="font-mono font-bold text-slate-900">{sosModalAmbulance.vehicleNumber}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Estimated Arrival Time:</span>
                <strong className="text-emerald-700 font-black text-sm">~{sosModalAmbulance.etaMinutes} Minutes ({sosModalAmbulance.distanceKm} km away)</strong>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Assigned Pilot / Driver</span>
                  <strong className="text-slate-900 text-sm">{sosModalAmbulance.driverName}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Direct Phone Number</span>
                  <a
                    href={`tel:${sosModalAmbulance.driverPhone}`}
                    className="font-mono font-black text-indigo-600 hover:underline text-sm block"
                  >
                    {sosModalAmbulance.driverPhone}
                  </a>
                </div>
              </div>
            </div>

            {/* Action Checklist */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 text-[11px] text-emerald-950 space-y-1">
              <strong className="block font-bold uppercase text-[10px] text-emerald-800">
                While Waiting for the Ambulance:
              </strong>
              <p>✓ Keep your mobile phone charged and line free so driver can reach you.</p>
              <p>✓ Turn on mobile flashlight or wave bright cloth if in poor visibility.</p>
              <p>✓ If on flooded ground, stay on elevated steps or high curb.</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <a
              href={`tel:${sosModalAmbulance.driverPhone}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-sm"
            >
              <PhoneCall className="h-4 w-4" /> Call Driver Directly ({sosModalAmbulance.driverName})
            </a>
            <button
              onClick={() => setSosModalAmbulance(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
            >
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderShelterDetailModal = () => {
    if (!selectedShelterModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl text-slate-800 my-8">
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 ring-4 ring-indigo-50/50">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  DESIGNATED CIVIL RELIEF SHELTER
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">{selectedShelterModal.name}</h3>
                <p className="text-xs text-slate-500">{selectedShelterModal.locationName}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedShelterModal(null)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3.5 my-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Distance from GPS</span>
                <span className="text-base font-black text-slate-900">{selectedShelterModal.distanceKm} km</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Structural Elevation</span>
                <span className="text-base font-black text-indigo-700">{selectedShelterModal.elevationMeters}m Bedrock</span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-emerald-950">
              <div className="flex items-center justify-between mb-1">
                <strong className="text-xs font-bold text-emerald-900">Bed Availability:</strong>
                <span className="font-mono font-black text-emerald-700">
                  {selectedShelterModal.capacity - selectedShelterModal.occupied} Free / {selectedShelterModal.capacity} Total
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Food rations, drinking water purification, and emergency bedding are pre-stocked.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
              <strong className="block text-slate-900 font-bold uppercase text-[10px]">Safe Approach & Route:</strong>
              <p className="leading-relaxed text-xs">{selectedShelterModal.approachInstructions}</p>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-950 space-y-1">
              <strong className="block text-amber-900 font-bold uppercase text-[10px]">Geological Assessment:</strong>
              <p className="leading-relaxed text-[11px]">{selectedShelterModal.geologyNote}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">Available Provisions:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedShelterModal.facilities.map((fac, i) => (
                  <span key={i} className="bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-bold">
                    ✓ {fac}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedShelterModal.lat},${selectedShelterModal.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition shadow-sm"
            >
              <Navigation className="h-4 w-4" /> Open Navigation Map <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={() => setSelectedShelterModal(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAlertDetailModal = () => {
    if (!selectedAlert) return null;

    const alertKey = selectedAlert.alertId || selectedAlert.id;
    const currentLang = cardLangMap[alertKey] || 'en';
    const localized = getMultilingualAlertDetails(selectedAlert, currentLang);
    const isBroadcastingThis = isPlayingAudio && audioAlertId === alertKey;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl text-slate-800 my-8">
          <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${getRiskBadgeStyles(selectedAlert.severity)}`}>
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                  {localized.severity} • {localized.hazardType}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 border border-slate-200 font-mono">
                  ID: {alertKey}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{localized.title}</h2>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-red-500" /> {selectedAlert.affectedArea || selectedAlert.location}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[10px] font-bold">
                <span className="px-2 py-0.5 text-slate-400 flex items-center gap-1">
                  <Languages className="h-3 w-3" />
                </span>
                {ALERT_LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setCardLangMap(prev => ({ ...prev, [alertKey]: l.id }))}
                    className={`px-2 py-0.5 rounded-lg transition font-bold ${
                      currentLang === l.id
                        ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={`Switch modal text to ${l.label}`}
                  >
                    {l.flag} {l.native}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSelectedAlert(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-red-700 mb-1">Emergency Warning & Directive</h4>
              <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-medium">
                {localized.message}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900">
                <strong className="block font-black uppercase tracking-wider text-emerald-800 text-[10px] mb-1">
                  Designated Safe Shelter
                </strong>
                {localized.shelter}
              </div>

              <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-900">
                <strong className="block font-black uppercase tracking-wider text-sky-800 text-[10px] mb-1">
                  Designated Evacuation Corridor
                </strong>
                {localized.route}
              </div>
            </div>

            {localized.travelAdvisory && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                <strong>Travel Advisory:</strong> {localized.travelAdvisory}
              </div>
            )}

            {/* Active Audio Broadcast Banner */}
            {isBroadcastingThis && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700 animate-pulse shadow-xs">
                <div className="flex items-center gap-2 font-black">
                  <Volume2 className="h-4 w-4 text-red-600 animate-bounce" />
                  <span>Voice Siren Active ({audioAlertLang === 'hi' ? '🇮🇳 हिन्दी (Hindi)' : audioAlertLang === 'as' ? '🌾 অসমীয়া (Assamese)' : '🇬🇧 English'})...</span>
                </div>
                <button
                  onClick={handleStopSpeech}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black transition flex items-center gap-1 shadow-sm"
                >
                  <VolumeX className="h-3.5 w-3.5" /> Stop Siren
                </button>
              </div>
            )}

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
              <strong className="block text-slate-900 font-bold uppercase tracking-wider text-[11px]">Immediate Citizen Action Checklist:</strong>
              <div className="flex items-start gap-2 text-slate-700">
                <span className="text-emerald-600 font-bold">✓</span> Move to higher floors or designated relief centers immediately.
              </div>
              <div className="flex items-start gap-2 text-slate-700">
                <span className="text-emerald-600 font-bold">✓</span> Avoid flooded roadways (Turn Around, Don't Drown).
              </div>
              <div className="flex items-start gap-2 text-slate-700">
                <span className="text-emerald-600 font-bold">✓</span> Keep mobile batteries charged and emergency documentation waterproofed.
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {/* Multi-Language Listen Audio Warning Options */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-500 px-2 flex items-center gap-1">
                <Volume2 className="h-3.5 w-3.5 text-indigo-600" /> Listen:
              </span>

              {/* English */}
              <button
                type="button"
                onClick={() => handleSpeechBroadcast(selectedAlert, 'en')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  isBroadcastingThis && audioAlertLang === 'en'
                    ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs'
                }`}
                title="Listen in English"
              >
                {isBroadcastingThis && audioAlertLang === 'en' ? (
                  <>
                    <VolumeX className="h-3 w-3" /> Stop EN
                  </>
                ) : (
                  <>
                    <span>🇬🇧</span> English
                  </>
                )}
              </button>

              {/* Hindi */}
              <button
                type="button"
                onClick={() => handleSpeechBroadcast(selectedAlert, 'hi')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  isBroadcastingThis && audioAlertLang === 'hi'
                    ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs'
                }`}
                title="Listen in Hindi (हिन्दी)"
              >
                {isBroadcastingThis && audioAlertLang === 'hi' ? (
                  <>
                    <VolumeX className="h-3 w-3" /> Stop हिन्दी
                  </>
                ) : (
                  <>
                    <span>🇮🇳</span> हिन्दी
                  </>
                )}
              </button>

              {/* Assamese */}
              <button
                type="button"
                onClick={() => handleSpeechBroadcast(selectedAlert, 'as')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  isBroadcastingThis && audioAlertLang === 'as'
                    ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs'
                }`}
                title="Listen in Assamese (অসমীয়া)"
              >
                {isBroadcastingThis && audioAlertLang === 'as' ? (
                  <>
                    <VolumeX className="h-3 w-3" /> Stop অসমীয়া
                  </>
                ) : (
                  <>
                    <span>🌾</span> অসমীয়া
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => setSelectedAlert(null)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-black text-white transition shadow-sm"
            >
              Close Advisory
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==============================================================
  // MAIN COMPONENT RETURN (PRISTINE WHITE / LIGHT THEME)
  // ==============================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-x-hidden pb-20 sm:pb-12">
      {/* Background ambient glows */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-indigo-100/40 blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sky-100/40 blur-[140px] rounded-full" />
      </div>

      {/* TOP EMERGENCY HELPLINE TICKER */}
      <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-900 relative z-40 shadow-2xs">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-black tracking-wider uppercase text-[10px]">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
            <span className="text-red-900">Assam State Emergency Hotline:</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-bold flex-wrap">
            <a href="tel:112" className="hover:text-red-700 flex items-center gap-1 bg-white text-rose-900 px-2.5 py-0.5 rounded-lg border border-rose-200 shadow-2xs">
              <PhoneCall className="h-3 w-3 text-red-600" /> Police/National: 112
            </a>
            <a href="tel:1070" className="hover:text-red-700 flex items-center gap-1 bg-white text-rose-900 px-2.5 py-0.5 rounded-lg border border-rose-200 shadow-2xs">
              <PhoneCall className="h-3 w-3 text-red-600" /> Disaster SDMA: 1070 / 1077
            </a>
            <a href="tel:108" className="hover:text-red-700 flex items-center gap-1 bg-white text-rose-900 px-2.5 py-0.5 rounded-lg border border-rose-200 shadow-2xs">
              <PhoneCall className="h-3 w-3 text-red-600" /> Medical Ambulance: 108
            </a>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm font-black text-base">
              RD
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                Assam Disaster Alerts
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Citizen Portal
                </span>
              </h1>
              <p className="text-[11px] text-slate-500">Integrated Multi-Modal Flood & Hazard Early Warning</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                  <div className="h-5 w-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="font-bold text-slate-900 max-w-[100px] truncate">{currentUser.name}</span>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded font-black border border-indigo-200">
                    {currentUser.role}
                  </span>
                </div>

                {['ADMIN', 'EXPERT', 'DISPATCHER', 'FIRST_RESPONDER'].includes(currentUser.role) && (
                  <button
                    onClick={() => setUserRole('EXPERT')}
                    className="flex items-center gap-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl transition shadow-sm"
                  >
                    <Shield className="h-3.5 w-3.5" /> Operations Console
                  </button>
                )}

                <button
                  onClick={logoutUser}
                  className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 transition"
                >
                  <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl transition shadow-sm"
                >
                  <User className="h-3.5 w-3.5" /> Sign In / Register
                </button>
                <button 
                  onClick={() => setAuthModalOpen(true)} 
                  className="hidden sm:flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs"
                >
                  <Shield className="h-3.5 w-3.5 text-indigo-600" /> Admin Access
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DESKTOP TAB NAVIGATION */}
      <nav className="sticky top-[61px] z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 flex space-x-2 overflow-x-auto hide-scrollbar py-2">
          {([
            { id: 'HOME', label: 'My Area Overview', icon: Compass },
            { id: 'ALERTS', label: `Active Alerts (${displayAlerts.length})`, icon: AlertTriangle },
            { id: 'ROADS', label: 'Road Hazards', icon: Route },
            { id: 'WEATHER', label: 'Doppler Weather', icon: CloudRain },
            { id: 'REPORT', label: 'Report Hazard (AI)', icon: Camera }
          ] as const).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedAlert(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* TOAST CONFIRMATION */}
      {submitted && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-xl border border-emerald-500 animate-bounce">
          <CheckCircle2 className="h-5 w-5" /> Ground report analyzed & logged into SDMA Dispatch Queue.
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 relative z-10">
        {activeTab === 'HOME' && renderHome()}
        {activeTab === 'ALERTS' && renderAlertsTab()}
        {activeTab === 'ROADS' && renderRoadsTab()}
        {activeTab === 'WEATHER' && renderWeatherTab()}
        {activeTab === 'REPORT' && renderReportTab()}

        {/* TRUST DISCLAIMER */}
        <div className="mt-12 text-center text-xs text-slate-400 max-w-xl mx-auto">
          <p>
            Official disaster intelligence generated by the Assam State Multi-Modal Risk Early Warning Engine. 
            All public bulletins cross-checked with State Disaster Management Authority guidelines.
          </p>
        </div>
      </main>

      {/* ALERT DETAIL MODAL */}
      {renderAlertDetailModal()}

      {/* EMERGENCY SOS AMBULANCE MODAL */}
      {renderSosModal()}

      {/* SHELTER ROUTE DETAIL MODAL */}
      {renderShelterDetailModal()}

      {/* FLOATING SOS TOAST CONFIRMATION */}
      {sosSentToast && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-red-600 px-6 py-3.5 text-xs sm:text-sm font-black text-white shadow-2xl border border-red-500 animate-bounce">
          <Truck className="h-5 w-5 animate-pulse" />
          <span>{sosSentToast}</span>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe flex justify-around">
        <button 
          onClick={() => setActiveTab('HOME')}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${activeTab === 'HOME' ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
        >
          <Compass className="h-5 w-5" />
          <span className="text-[10px]">Overview</span>
        </button>
        <button 
          onClick={() => setActiveTab('ALERTS')}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${activeTab === 'ALERTS' ? 'text-red-600 font-bold' : 'text-slate-500'}`}
        >
          <AlertTriangle className="h-5 w-5" />
          <span className="text-[10px]">Alerts ({displayAlerts.length})</span>
        </button>
        <button 
          onClick={() => setActiveTab('ROADS')}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${activeTab === 'ROADS' ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
        >
          <Route className="h-5 w-5" />
          <span className="text-[10px]">Roads</span>
        </button>
        <button 
          onClick={() => setActiveTab('REPORT')}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${activeTab === 'REPORT' ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
        >
          <Camera className="h-5 w-5" />
          <span className="text-[10px]">Report</span>
        </button>
      </nav>

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={() => {}}
      />
    </div>
  );
};
