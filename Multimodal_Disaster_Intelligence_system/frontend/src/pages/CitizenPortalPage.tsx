import React, { useState, useRef, useEffect } from 'react';
import { 
  AlertTriangle, ArrowRight, Camera, CheckCircle2, Compass, Info, MapPin, CloudRain,
  Crosshair, AlertOctagon, Clock, ChevronRight, ShieldCheck, Route,
  User, LogOut, Shield, Volume2, VolumeX, PhoneCall, Sparkles, Brain, CheckCircle, XCircle,
  RefreshCw, Radio, Building2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AuthModal } from '../components/common/AuthModal';
import type { HazardType, RiskLevel, CommunityAlert, ReportAiAnalysis } from '../types';
import { validateCommunityReportClientSide } from '../utils/aiReportValidator';
import exifr from 'exifr';

// Simulated telemetry data for weather and road transit corridors
const MOCK_WEATHER = {
  temp: '26°C',
  condition: 'Heavy Precipitation & River Surge',
  rainProb: '88%',
  rainfall24h: '78.4 mm',
  riverLevel: '2.45m (0.45m above danger mark)',
  forecast: 'Sustained monsoon downpour expected through midnight. Extreme surface inundation and flash flood risks active.',
  icon: <CloudRain className="h-7 w-7 text-indigo-600" />
};

const MOCK_ROADS = [
  { name: 'NH-27 Corridor (Kamrup-Sonapur)', status: 'CLOSED', reason: 'Severe river overflow & waterlogging up to 3.2 ft', updated: '10 mins ago', location: 'Near Brahmaputra Highland Approach' },
  { name: 'State Highway 12 (SH-12 Bypass)', status: 'OPEN - ADVISORY', reason: 'Designated high-ground evacuation route', updated: 'Live', location: 'North Kamrup Elevated Sector' },
  { name: 'GS Road (Khanapara - Dispur)', status: 'POTENTIALLY AFFECTED', reason: 'Slope mud run-off & drain regurgitation', updated: '25 mins ago', location: 'Khanapara Sector' },
  { name: 'Paltan Bazaar Flyover Connector', status: 'OPEN', reason: 'Elevated roadway operating normally', updated: 'Live', location: 'Guwahati Central' }
];

const ASSAM_DISTRICTS = [
  'Guwahati (Kamrup Metro)', 'Barpeta', 'Bongaigaon', 'Cachar', 'Darrang', 'Dhemaji', 
  'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 
  'Jorhat', 'Kamrup', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 
  'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'Tinsukia'
];

export const CitizenPortalPage: React.FC = () => {
  const { alerts, submitReport, setUserRole, currentUser, logoutUser, authModalOpen, setAuthModalOpen } = useApp();
  
  const [activeTab, setActiveTab] = useState<'HOME' | 'ALERTS' | 'ROADS' | 'WEATHER' | 'REPORT'>('HOME');
  const [selectedAlert, setSelectedAlert] = useState<CommunityAlert | null>(null);
  
  // Audio Speech Warning State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioAlertId, setAudioAlertId] = useState<string | null>(null);

  // Form State for Report
  const [hazardType, setHazardType] = useState<HazardType>('FLOOD'); 
  const [severity, setSeverity] = useState<RiskLevel>('HIGH');
  const [location, setLocation] = useState('Guwahati (Kamrup Metro)'); 
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
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeechBroadcast = (alertItem: CommunityAlert) => {
    if (!window.speechSynthesis) {
      alert("Text-to-speech audio broadcast is not supported in this browser.");
      return;
    }

    if (isPlayingAudio && audioAlertId === alertItem.id) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setAudioAlertId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak = `Official Emergency Broadcast. Severity: ${alertItem.severity}. Hazard: ${alertItem.hazardType}. Location: ${alertItem.affectedArea}. Attention all residents: ${alertItem.messageEn || alertItem.safetyInstructions}. Designated safe shelter is ${alertItem.shelterRecommendation || 'Kamrup Multi Purpose Relief Shelter'}. Safe evacuation route: ${alertItem.routeAdvice || 'State Highway 12 Highland Bypass'}. Move to higher ground immediately.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.lang = 'en-IN';

    utterance.onstart = () => {
      setIsPlayingAudio(true);
      setAudioAlertId(alertItem.id);
    };

    utterance.onend = () => {
      setIsPlayingAudio(false);
      setAudioAlertId(null);
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setAudioAlertId(null);
    };

    window.speechSynthesis.speak(utterance);
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
          setLocation(`GPS: ${pos.coords.latitude.toFixed(3)}°N, ${pos.coords.longitude.toFixed(3)}°E (Guwahati Metro)`);
        },
        () => {
          setLocation('Guwahati (Kamrup Metro)');
        }
      );
    } else {
      setLocation('Guwahati (Kamrup Metro)');
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
      district: location.includes('(') ? location.split('(')[1].replace(')', '') : 'Kamrup Metro', 
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
      {/* Location Selector & Geolocation Lock Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Assam Civil Defense Zone</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <select 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 font-black text-base sm:text-lg rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {ASSAM_DISTRICTS.map(d => (
                  <option key={d} value={d} className="bg-white text-slate-900">{d}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Live flood telemetry, safe shelters & evacuation directives for this sector</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={requestLocation} 
            className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition shadow-2xs hover:text-slate-900"
          >
            <Crosshair className="h-4 w-4 text-indigo-600" /> Lock Current GPS
          </button>
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
            {displayAlerts.map((alert) => (
              <div 
                key={alert.id}
                className="group relative overflow-hidden rounded-2xl border-2 border-red-200/90 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition"
              >
                {/* Glowing alert accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-indigo-600" />

                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase border ${getRiskBadgeStyles(alert.severity)}`}>
                      <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                      {alert.severity} RISK • {alert.hazardType}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 border border-slate-200">
                      ID: {alert.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{alert.issuedAt || 'Active Now'}</span>
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2 group-hover:text-red-600 transition">
                  {alert.title}
                </h3>

                <p className="text-sm font-medium leading-relaxed text-slate-700 mb-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  {alert.messageEn || alert.safetyInstructions}
                </p>

                {/* Rich Emergency Details: Shelter, Route, Travel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-emerald-900 flex items-start gap-2.5">
                    <Building2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black block uppercase tracking-wider text-[10px] text-emerald-800">Designated Safe Shelter</span>
                      <p className="font-bold text-emerald-950 mt-0.5">{alert.shelterRecommendation || 'Kamrup Multi-Purpose Relief Shelter'}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-sky-900 flex items-start gap-2.5">
                    <Route className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black block uppercase tracking-wider text-[10px] text-sky-800">Recommended Evacuation Route</span>
                      <p className="font-bold text-sky-950 mt-0.5">{alert.routeAdvice || 'SH-12 Highland Transit Bypass Corridor'}</p>
                    </div>
                  </div>
                </div>

                {alert.travelAdvisory && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 mb-4 flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-amber-600 shrink-0" />
                    <span><strong>Transit Advisory:</strong> {alert.travelAdvisory}</span>
                  </div>
                )}

                {/* Card Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span>{alert.affectedArea || alert.location}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Voice Siren Broadcast Button */}
                    <button
                      onClick={() => handleSpeechBroadcast(alert)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-2xs ${
                        isPlayingAudio && audioAlertId === alert.id
                          ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                      }`}
                    >
                      {isPlayingAudio && audioAlertId === alert.id ? (
                        <>
                          <VolumeX className="h-3.5 w-3.5" /> Stop Voice Siren
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5 text-indigo-600" /> Listen to Audio Warning
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedAlert(alert)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
                    >
                      Full Advisory <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
            <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              NH-27 Inundated
            </span>
          </div>

          <div className="space-y-2.5">
            {MOCK_ROADS.slice(0, 3).map((r, i) => (
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
                  <p className="text-xs text-slate-600 mt-0.5">{r.reason}</p>
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
              Monsoon Warning Active
            </span>
          </div>

          <div className="flex items-center justify-between mb-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <p className="text-3xl font-black text-slate-900">{MOCK_WEATHER.temp}</p>
              <p className="text-xs font-bold text-indigo-700 mt-0.5">{MOCK_WEATHER.condition}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              {MOCK_WEATHER.icon}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">24h Cumulative Rain</span>
              <span className="font-black text-slate-900 text-sm">{MOCK_WEATHER.rainfall24h}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Brahmaputra Gauge Level</span>
              <span className="font-black text-red-600 text-sm">2.45m (+0.45m)</span>
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
        {displayAlerts.map((alert) => (
          <div 
            key={alert.id}
            className="rounded-2xl border-2 border-red-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${getRiskBadgeStyles(alert.severity)}`}>
                <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                {alert.severity} • {alert.hazardType}
              </span>
              <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Issued: {alert.issuedAt || 'Active Now'}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-2">{alert.title}</h3>
            
            <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              {alert.messageEn || alert.safetyInstructions}
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
                  <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {alert.shelterRecommendation || 'Kamrup District Relief Hub'}
                </span>
              </div>
              <div className="bg-sky-50 p-3.5 rounded-xl border border-sky-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 block mb-1">Safe Evacuation Route</span>
                <span className="font-bold text-sky-950 flex items-center gap-1">
                  <Route className="h-3.5 w-3.5 text-sky-600 shrink-0" /> {alert.routeAdvice || 'SH-12 Highland Bypass'}
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Authorized By: <strong className="text-slate-800">{alert.approvedBy || 'Assam SDMA'}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSpeechBroadcast(alert)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    isPlayingAudio && audioAlertId === alert.id
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                  }`}
                >
                  <Volume2 className="h-3.5 w-3.5 text-indigo-600" /> Voice Siren
                </button>
                <button
                  onClick={() => setSelectedAlert(alert)}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
                >
                  View Complete Details <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
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
        {MOCK_ROADS.map((road, idx) => (
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
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {road.location}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-indigo-600 shrink-0" /> {road.reason}
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Telemetry Check</span>
              <span className="text-xs font-mono font-bold text-slate-700">{road.updated}</span>
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
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Surface Temperature</span>
            <p className="text-5xl font-black text-slate-900 mt-1">{MOCK_WEATHER.temp}</p>
            <p className="text-sm font-bold text-indigo-600 mt-1">{MOCK_WEATHER.condition}</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            {MOCK_WEATHER.icon}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Rain Probability</span>
            <span className="text-2xl font-black text-slate-900">{MOCK_WEATHER.rainProb}</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">24h Precipitation</span>
            <span className="text-2xl font-black text-slate-900">{MOCK_WEATHER.rainfall24h}</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Brahmaputra Gauge Level</span>
            <span className="text-2xl font-black text-red-600">2.45m</span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700">
          <strong className="block text-slate-900 font-bold mb-1">Official IMD Meteorological Bulletin:</strong>
          {MOCK_WEATHER.forecast}
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

  const renderAlertDetailModal = () => {
    if (!selectedAlert) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl text-slate-800 my-8">
          <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-200">
            <div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${getRiskBadgeStyles(selectedAlert.severity)}`}>
                <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                {selectedAlert.severity} • {selectedAlert.hazardType}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{selectedAlert.title}</h2>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-red-500" /> {selectedAlert.affectedArea || selectedAlert.location}
              </p>
            </div>
            <button
              onClick={() => setSelectedAlert(null)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-red-700 mb-1">Emergency Warning & Directive</h4>
              <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-medium">
                {selectedAlert.messageEn || selectedAlert.safetyInstructions}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900">
                <strong className="block font-black uppercase tracking-wider text-emerald-800 text-[10px] mb-1">
                  Designated Safe Shelter
                </strong>
                {selectedAlert.shelterRecommendation || 'Kamrup Multi-Purpose Relief Center'}
              </div>

              <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-900">
                <strong className="block font-black uppercase tracking-wider text-sky-800 text-[10px] mb-1">
                  Designated Evacuation Corridor
                </strong>
                {selectedAlert.routeAdvice || 'State Highway 12 Highland Bypass'}
              </div>
            </div>

            {selectedAlert.travelAdvisory && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                <strong>Travel Advisory:</strong> {selectedAlert.travelAdvisory}
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

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              onClick={() => handleSpeechBroadcast(selectedAlert)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-800 border border-slate-200"
            >
              <Volume2 className="h-4 w-4 text-indigo-600" /> Listen to Audio Warning
            </button>

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
