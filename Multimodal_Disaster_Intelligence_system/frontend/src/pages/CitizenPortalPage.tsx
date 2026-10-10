import React, { useState, useRef } from 'react';
import { 
  AlertTriangle, ArrowRight, Camera, CheckCircle2, Compass, Info, MapPin, UserCheck, CloudRain,
  Navigation2, Crosshair, AlertCircle,
  AlertOctagon, Check, Clock, ChevronRight, ShieldCheck, Route,
  User, LogOut, Shield
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AuthModal } from '../components/common/AuthModal';
import type { HazardType, RiskLevel, CommunityAlert } from '../types';
import exifr from 'exifr';

// Simulated data to satisfy citizen portal requirements that aren't natively in the backend yet.
const MOCK_WEATHER = {
  temp: '26°C',
  condition: 'Heavy rainfall expected',
  rainProb: '85%',
  forecast: 'Rain may continue through the evening. Heavy rainfall may increase flood/landslide risk.',
  icon: <CloudRain className="h-6 w-6 text-sky-500" />
};

const MOCK_ROADS = [
  { name: 'NH-27', status: 'CLOSED', reason: 'Flooding reported', updated: '12:15 PM', location: 'Near Brahmaputra Bridge' },
  { name: 'State Highway 12', status: 'POTENTIALLY AFFECTED', reason: 'Heavy rain warnings', updated: '1:00 PM', location: 'Sonitpur District' },
  { name: 'Local Road - Ward 4', status: 'WATERLOGGED', reason: 'Drainage overflow', updated: '1:30 PM', location: 'Silchar City' }
];

const MOCK_DANGER_ZONES = [
  'Low-lying areas near Brahmaputra',
  'NH-27 Bridge approach',
  'Slopes in Dima Hasao'
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
  
  const [submitted, setSubmitted] = useState(false);
  
  const [hazardType, setHazardType] = useState<HazardType>('FLOOD'); 
  const [severity, setSeverity] = useState<RiskLevel>('HIGH');
  const [location, setLocation] = useState('Guwahati (Kamrup Metro)'); 
  const [description, setDescription] = useState('');
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);
  const [exifLocation, setExifLocation] = useState<{lat: number; lng: number} | undefined>(undefined);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedAlert, setSelectedAlert] = useState<CommunityAlert | null>(null);

  // Filter only ACTIVE, public verified alerts
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE' || a.status === 'SENT' || a.status === 'PENDING_PUBLISH'); // Pending publish is mock for active here for demo purposes if there are no active ones. Actually let's assume 'ACTIVE' and 'SENT' are public.
  const publicAlerts = activeAlerts.length > 0 ? activeAlerts : alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').slice(0, 1);

  const mainAlert = publicAlerts[0];

  const submit = (event: React.FormEvent) => { 
    event.preventDefault(); 
    submitReport({ 
      type: hazardType, 
      location, 
      district: 'Kamrup Metro', 
      severity, 
      description: description || 'Local citizen observation reported via mobile app.', 
      photoUrl: photoBlobUrl || undefined,
      exifLocation: exifLocation 
    }); 
    setSubmitted(true); 
    setDescription(''); 
    setPhotoName(null); 
    setPhotoBlobUrl(null);
    setExifLocation(undefined);
    setTimeout(() => setSubmitted(false), 4000); 
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoName(file.name);
      setPhotoBlobUrl(URL.createObjectURL(file));
      try {
        const gps = await exifr.gps(file);
        if (gps) {
          setExifLocation({ lat: gps.latitude, lng: gps.longitude });
          setLocation(`Auto-detected from Photo GPS`);
        }
      } catch (err) {
        console.error('Error extracting EXIF data:', err);
      }
    }
  };

  const requestLocation = () => {
    // Mock location request
    setLocationGranted(true);
    setLocation('Current GPS Location (Guwahati)');
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-600';
      case 'HIGH': return 'bg-orange-500';
      case 'MODERATE': return 'bg-amber-400';
      case 'LOW': return 'bg-emerald-500';
      default: return 'bg-slate-500';
    }
  };
  
  const getRiskBadgeColor = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 ring-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 ring-orange-200';
      case 'MODERATE': return 'bg-amber-100 text-amber-800 ring-amber-200';
      case 'LOW': return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
      default: return 'bg-slate-100 text-slate-800 ring-slate-200';
    }
  };

  // -------------------------------------------------------------
  // SECTIONS RENDERING
  // -------------------------------------------------------------
  
  const renderHome = () => (
    <div className="space-y-6">
      {/* Location Bar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-white/90 bg-white/80 p-4 shadow-[0_14px_32px_rgba(15,23,42,.07)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 text-indigo-600 ring-1 ring-indigo-100">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">Safety coverage</p>
            <h2 className="font-display text-xl font-black text-slate-900">{location}</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">Alerts, roads, and weather for your selected area</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={requestLocation} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
            <Crosshair className="h-4 w-4" /> Use GPS
          </button>
        </div>
      </div>

      {locationGranted === false && (
        <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm font-medium flex gap-2 items-center">
          <AlertCircle className="h-5 w-5" /> Location access unavailable. Please select your location manually.
        </div>
      )}

      {/* Primary Alert (If any) */}
      {publicAlerts.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Active Alerts Near You
          </h3>
          {publicAlerts.slice(0, 2).map((alert) => (
             <div 
               key={alert.id}
               onClick={() => setSelectedAlert(alert)}
               className={`relative overflow-hidden rounded-2xl border-2 p-5 shadow-sm cursor-pointer transition-transform hover:-translate-y-1 ${alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50'}`}
             >
               <div className="flex justify-between items-start mb-3">
                 <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider ring-1 ${getRiskBadgeColor(alert.severity)}`}>
                   <span className={`h-1.5 w-1.5 animate-ping rounded-full ${getRiskColor(alert.severity)}`} /> 
                   {alert.severity} {alert.hazardType}
                 </span>
                 <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                   <Clock className="h-3 w-3" /> Updated 12:15 PM
                 </span>
               </div>
               
               <h3 className="font-display text-xl font-black text-slate-900 mb-2">{alert.title}</h3>
               <p className="text-sm text-slate-600 mb-4 line-clamp-2">{alert.messageEn}</p>
               
               <div className="flex justify-between items-center pt-3 border-t border-slate-200/50">
                 <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                   <MapPin className="h-4 w-4 text-slate-400" /> {alert.affectedArea}
                 </p>
                 <span className="text-sm font-bold text-indigo-600 flex items-center gap-1">
                   View Alert <ChevronRight className="h-4 w-4" />
                 </span>
               </div>
             </div>
          ))}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 text-center shadow-sm sm:p-8">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-100/60 blur-2xl" />
          <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
            <Check className="h-6 w-6" />
          </div>
          <p className="relative mt-4 text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">Safety status</p>
          <h3 className="relative mt-1 font-display text-xl font-black text-emerald-950">No Active Disaster Alerts</h3>
          <p className="relative mx-auto mt-2 max-w-lg text-sm leading-relaxed text-emerald-800">There are no verified active alerts near your selected location. Conditions can change quickly during heavy rain.</p>
          <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/75 px-3 py-1.5 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-3.5 w-3.5" /> Official sources are being monitored</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Travel Advisory Summary */}
        <div className="group rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(15,23,42,.09)]">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Route className="h-4 w-4 text-indigo-500" /> Travel Advisory
          </h3>
          {mainAlert && (mainAlert.severity === 'HIGH' || mainAlert.severity === 'CRITICAL') ? (
            <div className="space-y-2">
              <p className="text-2xl font-black text-red-600">AVOID TRAVEL IN THIS AREA</p>
              <p className="text-sm text-slate-600">Heavy rainfall and flooding make travel unsafe.</p>
              <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-100">
                <span className="font-bold block mb-1 text-slate-900">Travel Window</span>
                Travel is currently discouraged. Conditions are not expected to improve before 6:00 PM.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-display text-2xl font-black text-emerald-600">Travel with caution</p>
              <p className="text-sm text-slate-600">No current travel restrictions reported, but always stay alert.</p>
            </div>
          )}
          <button onClick={() => setActiveTab('ROADS')} className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 transition group-hover:gap-2.5 hover:text-indigo-800">Check road conditions <ArrowRight className="h-4 w-4" /></button>
        </div>

        {/* Weather Summary */}
        <div className="group rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(15,23,42,.09)]">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <CloudRain className="h-4 w-4" /> Weather conditions
          </h3>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-black text-slate-900">{MOCK_WEATHER.temp}</p>
              <p className="text-sm font-bold text-sky-600 mt-1">{MOCK_WEATHER.condition}</p>
            </div>
            <div className="p-3 bg-sky-50 rounded-2xl">
              {MOCK_WEATHER.icon}
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
            {MOCK_WEATHER.forecast}
          </p>
          <button onClick={() => setActiveTab('WEATHER')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 transition group-hover:gap-2.5 hover:text-indigo-800">View weather details <ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>

      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200/60 sm:flex sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-indigo-200">Community safety</p>
          <h3 className="mt-1 font-display text-lg font-black">See something unsafe?</h3>
          <p className="mt-1 text-sm text-indigo-100">A quick report helps emergency teams assess local conditions faster.</p>
        </div>
        <button onClick={() => setActiveTab('REPORT')} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 sm:mt-0"><Camera className="h-4 w-4" /> Report a hazard</button>
      </section>

    </div>
  );

  const renderAlertDetail = () => {
    if (!selectedAlert) return null;
    
    const getAlertBannerClass = (severity: RiskLevel) => {
      switch (severity) {
        case 'CRITICAL': return 'bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-red-200';
        case 'HIGH': return 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-orange-200';
        case 'MODERATE': return 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-amber-200';
        case 'LOW': return 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-200';
        default: return 'bg-slate-600 text-white shadow-slate-200';
      }
    };

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedAlert(null)} className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:underline">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back to Alerts
        </button>

        <div className={`p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden ${getAlertBannerClass(selectedAlert.severity)}`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="flex justify-between items-start mb-6 relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-black tracking-wider shadow-sm">
              {selectedAlert.severity} ALERT
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-bold shadow-sm">
              <UserCheck className="h-3 w-3" /> Official Warning
            </span>
          </div>
          
          <h1 className="font-display text-3xl sm:text-4xl font-black mb-6 leading-tight relative">
            {selectedAlert.title}
          </h1>
          
          <div className="grid grid-cols-2 gap-4 relative">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl">
              <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1">Location</p>
              <p className="font-bold text-lg">{selectedAlert.affectedArea}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl">
              <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1">Status</p>
              <p className="font-bold text-lg">ACTIVE</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8 relative z-10">
          <section>
            <h3 className="text-lg font-black text-slate-900 mb-3 tracking-tight">WHAT IS HAPPENING?</h3>
            <p className="text-slate-700 font-medium leading-relaxed text-sm sm:text-base">
              {selectedAlert.messageEn || "Dangerous conditions have been reported in this area. Environmental conditions may make travel unsafe and pose a risk to life and property."}
            </p>
          </section>

          <hr className="border-slate-100" />

          <section>
            <h3 className="text-lg font-black text-red-600 flex items-center gap-2 mb-3">
              <AlertOctagon className="h-5 w-5" /> DANGER ZONES
            </h3>
            <p className="text-sm text-slate-600 mb-3">Avoid the following locations due to verified active alerts:</p>
            <ul className="space-y-2">
              {MOCK_DANGER_ZONES.map((zone, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700 text-sm font-medium bg-red-50 p-3 rounded-xl border border-red-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                  {zone}
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section>
            <h3 className="text-lg font-black text-slate-900 mb-3">IMPACT ESTIMATES</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center text-center">
                <span className="text-2xl mb-1">🏠</span>
                <span className="text-lg font-black text-slate-900">{selectedAlert.estimatedBuildingsAffected ?? 137}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Buildings Affected</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center text-center">
                <span className="text-2xl mb-1">🏫</span>
                <span className="text-lg font-black text-slate-900">{selectedAlert.affectedSchools ?? 2}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Schools Affected</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center text-center">
                <span className="text-2xl mb-1">🏥</span>
                <span className="text-lg font-black text-slate-900">{selectedAlert.affectedHospitals ?? 1}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hospitals Affected</span>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col items-center text-center">
                <span className="text-2xl mb-1">🛣️</span>
                <span className="text-sm font-black text-indigo-900 mt-1">Available</span>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Alt Route</span>
              </div>
            </div>
            
            <h3 className="text-lg font-black text-slate-900 mb-3">WHAT SHOULD I DO?</h3>
            <ul className="space-y-3">
              <Advice title="Move to safe areas" text="Follow official evacuation instructions and move to higher ground if instructed." />
              <Advice title="Avoid floodwater" text="Do not walk, swim, or drive through floodwaters. Turn around, don't drown." />
              <Advice title="Stay informed" text="Keep monitoring this page or official channels for updates." />
            </ul>
          </section>
        </div>
      </div>
    );
  };

  const renderRoads = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-900">Road Conditions</h2>
      <p className="text-slate-600 text-sm">Verified road statuses based on active alerts and reports.</p>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {MOCK_ROADS.map((road, idx) => (
          <div key={idx} className={`p-4 sm:p-5 border-b border-slate-100 last:border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${road.status === 'CLOSED' ? 'bg-red-50/30' : ''}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-900 text-lg">{road.name}</h3>
                <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md ${
                  road.status === 'CLOSED' ? 'bg-red-100 text-red-700' : 
                  road.status === 'POTENTIALLY AFFECTED' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {road.status}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-600 mb-1">{road.location}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Info className="h-3 w-3" /> {road.reason}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-bold text-slate-400">LAST UPDATED</p>
              <p className="text-sm font-medium text-slate-700">{road.updated}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 leading-relaxed font-medium">
          Note: "Potentially affected" means the road is near a hazard zone, but closure has not been fully verified by authorities. Always exercise caution.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-800 pb-20 sm:pb-0 font-sans relative overflow-x-hidden">
      {/* Ambient background glows for modern look (Fixed layering) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sky-100/40 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-100/40 blur-[120px] rounded-full" />
      </div>
      
      {/* Toast Notification */}
      {submitted && (
        <div className="fixed top-5 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-200">
          <CheckCircle2 className="h-5 w-5" /> Report received. Thank you for keeping the community safe.
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100 shadow-sm relative">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3 relative z-10 flex-wrap">
          <div>
            <h1 className="font-display text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Assam Disaster Alerts
            </h1>
            <p className="text-[11px] font-medium text-slate-500">Real-time alerts & safety information</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 shadow-2xs">
                  <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="truncate max-w-[110px]">{currentUser.name}</span>
                  <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-black">
                    {currentUser.role}
                  </span>
                </div>

                {['ADMIN', 'EXPERT', 'DISPATCHER', 'FIRST_RESPONDER'].includes(currentUser.role) && (
                  <button
                    onClick={() => setUserRole('EXPERT')}
                    className="flex items-center gap-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition shadow-sm"
                  >
                    <Shield className="h-3.5 w-3.5" /> Operations Console
                  </button>
                )}

                <button
                  onClick={logoutUser}
                  title="Sign Out"
                  className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition"
                >
                  <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-extrabold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-3.5 py-1.5 rounded-xl transition shadow-md shadow-indigo-200"
                >
                  <User className="h-3.5 w-3.5" /> Sign In / Register
                </button>

                <button 
                  onClick={() => setUserRole('EXPERT')} 
                  className="hidden sm:flex text-[11px] font-bold bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg transition border border-slate-200 shadow-2xs"
                >
                  Switch to Expert View
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="hidden sm:block bg-white/70 backdrop-blur-sm border-b border-slate-100 relative z-30">
        <div className="max-w-4xl mx-auto px-4 flex space-x-1 overflow-x-auto hide-scrollbar">
          {(['HOME', 'ALERTS', 'ROADS', 'WEATHER', 'REPORT'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedAlert(null); }}
              className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab && !selectedAlert ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab === 'HOME' ? 'MY AREA' : tab}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:py-8 relative z-10">
        {selectedAlert ? renderAlertDetail() : (
          <>
            {activeTab === 'HOME' && renderHome()}
            {activeTab === 'ALERTS' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-slate-900">Active Alerts</h2>
                <p className="text-slate-600 text-sm">Verified emergency alerts from official sources and early warning systems.</p>
                {activeAlerts.map((alert) => (
                   <div 
                     key={alert.id}
                     onClick={() => setSelectedAlert(alert)}
                     className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm cursor-pointer transition-transform hover:-translate-y-1 bg-white border-slate-200`}
                   >
                     <div className="flex justify-between items-start mb-3">
                       <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider ring-1 ${getRiskBadgeColor(alert.severity)}`}>
                         {alert.severity} {alert.hazardType}
                       </span>
                     </div>
                     <h3 className="font-display text-xl font-black text-slate-900 mb-2">{alert.title}</h3>
                     <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                       <MapPin className="h-4 w-4 text-slate-400" /> {alert.affectedArea}
                     </p>
                     <p className="text-sm font-bold text-indigo-600 flex items-center gap-1">
                       View Alert <ChevronRight className="h-4 w-4" />
                     </p>
                   </div>
                ))}
                {activeAlerts.length === 0 && (
                   <div className="bg-emerald-50 p-6 rounded-2xl text-center">
                    <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <h3 className="font-black text-emerald-900">No active alerts</h3>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'ROADS' && renderRoads()}
            {activeTab === 'WEATHER' && (
               <div className="space-y-6">
                 <h2 className="text-2xl font-black text-slate-900">Weather</h2>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-5xl font-black text-slate-900">{MOCK_WEATHER.temp}</p>
                        <p className="text-lg font-bold text-sky-600 mt-2">{MOCK_WEATHER.condition}</p>
                      </div>
                      <div className="p-4 bg-sky-50 rounded-full">
                        {MOCK_WEATHER.icon}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <p className="text-xs font-bold text-slate-400 uppercase">Rain Probability</p>
                        <p className="text-xl font-black text-slate-800">{MOCK_WEATHER.rainProb}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <p className="text-xs font-bold text-slate-400 uppercase">Next few hours</p>
                        <p className="text-sm font-bold text-slate-800 mt-1">Heavy rain</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-sm font-medium text-amber-800">
                      <strong className="block mb-1">Weather Alert:</strong>
                      {MOCK_WEATHER.forecast}
                    </div>
                 </div>
               </div>
            )}
            {activeTab === 'REPORT' && (
              <div className="space-y-6 max-w-xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">Report a Hazard</h2>
                  <p className="text-slate-600 text-sm mt-2">Help keep your community safe by reporting what you see.</p>
                </div>
                
                <form onSubmit={submit} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
                  <Field label="WHAT DID YOU SEE?">
                    <select value={hazardType} onChange={e => setHazardType(e.target.value as HazardType)}>
                      <option value="FLOOD">Flood</option>
                      <option value="LANDSLIDE">Landslide</option>
                      <option value="BLOCKED_ROAD">Road Problem / Blocked</option>
                      <option value="RIVER_OVERFLOW">Waterlogging / River</option>
                      <option value="INFRASTRUCTURE_DAMAGE">Other</option>
                    </select>
                  </Field>
                  
                  <Field label="LOCATION">
                    <div className="flex gap-2 relative w-full">
                      <input 
                        value={location} 
                        onChange={e => setLocation(e.target.value)} 
                        className="flex-1"
                        list="assam-districts-list"
                        placeholder="Select or enter location..."
                      />
                      <datalist id="assam-districts-list">
                        {ASSAM_DISTRICTS.map(dist => (
                          <option key={dist} value={dist} />
                        ))}
                      </datalist>
                      <button type="button" onClick={requestLocation} className="px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors shrink-0">
                        <Crosshair className="h-5 w-5" />
                      </button>
                    </div>
                  </Field>
                  
                  <Field label="HOW SERIOUS IS IT?">
                    <div className="grid grid-cols-4 gap-2">
                      {(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const).map(level => (
                        <button 
                          key={level} 
                          type="button" 
                          onClick={() => setSeverity(level)} 
                          className={`rounded-xl py-3 text-[10px] font-black tracking-wider transition-colors ${severity === level ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </Field>
                  
                  <Field label="DESCRIPTION (OPTIONAL)">
                    <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what you saw..." />
                  </Field>
                  
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-4 text-sm font-bold text-slate-500 hover:border-sky-400 hover:text-sky-600 transition-colors bg-slate-50">
                    <Camera className="h-5 w-5" /> {photoName || 'TAKE PHOTO'}
                  </button>
                  {exifLocation && (
                    <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg text-center flex items-center justify-center gap-1">
                      <MapPin className="h-3 w-3" /> Location extracted from photo EXIF
                    </div>
                  )}
                  
                  <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors mt-6">
                    SUBMIT REPORT
                  </button>
                </form>
              </div>
            )}
          </>
        )}
        
        {/* Trust Disclaimer */}
        <div className="mt-12 text-center text-xs text-slate-400 max-w-xl mx-auto">
          <p>Risk information is based on available data and may change as conditions change. Always follow official government and emergency instructions.</p>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe flex justify-around">
        <MobileNavButton 
          icon={<Compass />} label="My Area" 
          active={activeTab === 'HOME' && !selectedAlert} 
          onClick={() => { setActiveTab('HOME'); setSelectedAlert(null); }} 
        />
        <MobileNavButton 
          icon={<AlertTriangle />} label="Alerts" 
          active={activeTab === 'ALERTS' || selectedAlert !== null} 
          onClick={() => { setActiveTab('ALERTS'); setSelectedAlert(null); }} 
        />
        <MobileNavButton 
          icon={<Navigation2 />} label="Roads" 
          active={activeTab === 'ROADS' && !selectedAlert} 
          onClick={() => { setActiveTab('ROADS'); setSelectedAlert(null); }} 
        />
        <MobileNavButton 
          icon={<Camera />} label="Report" 
          active={activeTab === 'REPORT' && !selectedAlert} 
          onClick={() => { setActiveTab('REPORT'); setSelectedAlert(null); }} 
        />
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={() => {}}
      />
    </div>
  );
};

// -------------------------------------------------------------
// HELPER COMPONENTS
// -------------------------------------------------------------

const MobileNavButton = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <div className={`[&>svg]:w-5 [&>svg]:h-5 ${active ? '[&>svg]:stroke-[2.5px]' : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-xs font-black text-slate-400 tracking-wider">
    <span className="mb-2 block">{label}</span>
    <div className="[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-slate-200 [&>input]:bg-slate-50 [&>input]:p-3 [&>input]:text-slate-800 [&>input]:font-medium [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-slate-200 [&>select]:bg-slate-50 [&>select]:p-3 [&>select]:text-slate-800 [&>select]:font-medium [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-slate-200 [&>textarea]:bg-slate-50 [&>textarea]:p-3 [&>textarea]:text-slate-800 [&>textarea]:font-medium focus-within:[&>input]:ring-2 focus-within:[&>input]:ring-indigo-100 focus-within:[&>input]:border-indigo-400">
      {children}
    </div>
  </label>
);

const Advice = ({ title, text }: { title: string; text: string }) => (
  <li className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm relative overflow-hidden">
    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 rounded-l-2xl" />
    <strong className="block text-slate-900 text-base mb-1.5">{title}</strong>
    <span className="text-sm font-medium text-slate-700 leading-relaxed block">{text}</span>
  </li>
);
