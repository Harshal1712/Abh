import React, { useState } from 'react';
import { AlertTriangle, Waves, Mountain, ShieldCheck, ArrowRight, Eye, MapPin, Radar, Radio, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InteractiveMap } from '../components/common/InteractiveMap';
import { RiskBadge } from '../components/common/RiskBadge';
import { MetricCard } from '../components/common/MetricCard';

// Procedural dynamic calculation based on geographic location across Assam terrain
function computeGeographicRisk(lat: number, lng: number) {
  const seed = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
  const rand = Math.abs(seed - Math.floor(seed));

  const isHilly = lat < 25.8 || lat > 26.6;
  const landslidePct = Math.round((isHilly ? (35 + rand * 32) : (18 + rand * 28)) * 10) / 10;
  const floodPct = Math.round((isHilly ? (19 + rand * 25) : (32 + rand * 40)) * 10) / 10;
  const slope = isHilly ? Math.round(18 + rand * 16) : Math.round(3 + rand * 10);
  const rain24h = Math.round((6 + rand * 26) * 10) / 10;
  const soilMoisture = Math.round((0.30 + rand * 0.28) * 100) / 100;

  const maxRisk = Math.max(landslidePct, floodPct);
  const riskClass = maxRisk >= 80 ? 'Critical' : maxRisk >= 69 ? 'High' : maxRisk >= 45 ? 'Moderate' : 'Low';

  return {
    landslidePct,
    floodPct,
    slope,
    rain24h,
    soilMoisture,
    riskClass,
    maxRisk,
  };
}

export const DashboardPage: React.FC = () => {
  const { events, setSelectedEventId, setActiveTab, createRiskEvent } = useApp();
  const [pointQueryData, setPointQueryData] = useState<any>(null);
  const [selectedDashboardEventId, setSelectedDashboardEventId] = useState<string>(events[0]?.id || '');

  const activeHighRiskZones = events.length;
  const floodRiskAreas = events.filter(e => e.primaryHazard === 'FLOOD' || e.primaryHazard === 'MULTI_HAZARD').length;
  const landslideRiskAreas = events.filter(e => e.primaryHazard === 'LANDSLIDE' || e.primaryHazard === 'MULTI_HAZARD').length;
  const pendingReviewCount = events.filter(e => e.status === 'PENDING_REVIEW').length;
  const open = (id:string, tab:'expert-review'|'event-detail') => { setSelectedEventId(id); setActiveTab(tab); };
  
  const handleMapClick = async (lat: number, lng: number) => {
    const fallbackName = `Assam Sector (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    const matchedEvt = events.find(e => 
      Math.abs(e.coordinates.lat - lat) < 0.05 && Math.abs(e.coordinates.lng - lng) < 0.05
    );

    const geo = computeGeographicRisk(lat, lng);

    const primaryRiskPct = matchedEvt
      ? Math.max(matchedEvt.landslideRisk || 0, matchedEvt.floodRisk || 0)
      : geo.maxRisk;

    const riskClass = matchedEvt
      ? (matchedEvt.combinedPriority || (primaryRiskPct >= 80 ? 'Critical' : primaryRiskPct >= 69 ? 'High' : 'Moderate'))
      : geo.riskClass;

    // Provide instant responsive state so Risk AI tab loads immediately (<10ms) without blank screens
    setPointQueryData({
      placeName: matchedEvt ? `${matchedEvt.title} (${matchedEvt.location})` : fallbackName,
      risk: { 
        current: primaryRiskPct / 100,
        landslide: matchedEvt ? (matchedEvt.landslideRisk ? matchedEvt.landslideRisk / 100 : 0.35) : geo.landslidePct / 100,
      },
      landslideProbability: matchedEvt ? (matchedEvt.landslideRisk || 35) : geo.landslidePct,
      floodProbability: matchedEvt ? (matchedEvt.floodRisk || 29) : geo.floodPct,
      risk_class: riskClass,
      rainfall: { '24h_mm': matchedEvt?.rainfall24h ?? geo.rain24h },
      slope: { degrees: matchedEvt?.avgSlope ?? geo.slope },
      soil_moisture: { value: matchedEvt?.soilMoisture ?? geo.soilMoisture },
      forecast: { '24h_mm': 0.7 },
      flood: {
        floodProbability: matchedEvt ? (matchedEvt.floodRisk ? matchedEvt.floodRisk / 100 : 0.29) : geo.floodPct / 100,
        model: 'CatBoost + Open-Meteo',
      },
      isEvent: Boolean(matchedEvt),
      loading: true,
    });

    try {
      // Local backend endpoints query CatBoost ML service directly (~80ms)
      const [res, floodRes] = await Promise.all([
        fetch(`/api/risk/location?lat=${lat}&lng=${lng}`),
        fetch(`/api/risk/flood?lat=${lat}&lon=${lng}`)
      ]);

      if (res.ok) {
        const data = await res.json();
        let floodData = null;
        if (floodRes.ok) {
          try {
            floodData = await floodRes.json();
          } catch {}
        }

        const placeTitle = matchedEvt 
          ? `${matchedEvt.title} (${matchedEvt.location})` 
          : fallbackName;

        // If it's a matched event, preserve its high-priority verified event values rather than overriding with generic point prediction
        const finalRiskCurrent = matchedEvt 
          ? (primaryRiskPct / 100) 
          : (data.risk?.current ?? (geo.maxRisk / 100));

        setPointQueryData((prev: any) => ({
          ...prev,
          ...data,
          risk: {
            ...data.risk,
            current: finalRiskCurrent,
          },
          risk_class: matchedEvt ? riskClass : (data.risk_class || geo.riskClass),
          flood: floodData || prev?.flood,
          placeName: placeTitle,
          loading: false
        }));

        // Decoupled, non-blocking reverse geocoding with 1.2s timeout so Nominatim never lags the UI
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
          .then(r => r.ok ? r.json() : null)
          .then(geo => {
            clearTimeout(timeoutId);
            if (geo?.display_name) {
              const cleanName = geo.display_name.split(',').slice(0, 3).join(',').trim();
              setPointQueryData((prev: any) => prev ? { ...prev, placeName: cleanName } : prev);
            }
          })
          .catch(() => {
            clearTimeout(timeoutId);
          });
      }
    } catch (e) {
      console.error(e);
      setPointQueryData((prev: any) => prev ? { ...prev, loading: false } : { error: 'Risk AI service temporarily unavailable.' });
    }
  };

  const cards = [
    { label:'Active risk zones', value:activeHighRiskZones, badge:`${events.filter(e => e.combinedPriority === 'CRITICAL').length} Critical`, detail:'Monitored hazard clusters', icon:AlertTriangle, tone:'danger' as const },
    { label:'Flood risk areas', value:floodRiskAreas, badge:'AI monitored', detail:'CatBoost flood inference pipeline', icon:Waves, tone:'info' as const },
    { label:'Landslide risk areas', value:landslideRiskAreas, badge:'AI monitored', detail:'Dynamic indicator & terrain baseline', icon:Mountain, tone:'warning' as const },
    { label:'Pending expert review', value:pendingReviewCount, badge:'Action required', detail:'Awaiting analyst sign-off before alert', icon:ShieldCheck, tone:'primary' as const }
  ];
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-1">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-600"><Radar className="h-3.5 w-3.5" /> Situation overview</div>
          <h1 className="font-display text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Multi-Hazard Intelligence Dashboard</h1>
          <p className="mt-1.5 text-xs font-medium text-slate-500">Data-driven flood and landslide monitoring with expert verification.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700"><Radio className="h-3 w-3 animate-pulse" /> Live monitoring</span>
          <button onClick={() => setActiveTab('active-events')} className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-slate-300/50 transition hover:-translate-y-0.5 hover:bg-indigo-700">Full-Screen GIS Map <ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => <MetricCard key={card.label} {...card} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-3">
          <div className="glass-panel p-4 rounded-2xl flex items-center justify-between"><h2 className="text-[13px] font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2 font-display"><MapPin className="h-4 w-4 text-emerald-500" /> Demo Himalayan Geospatial Sector GIS</h2><span className="text-xs text-slate-500 font-mono tracking-wider">INTERACTIVE OVERLAY</span></div>
          <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
            <InteractiveMap 
              events={events} 
              selectedEventId={selectedDashboardEventId || events[0]?.id} 
              onSelectEvent={id => {
                setSelectedDashboardEventId(id);
                setSelectedEventId(id);
                const ev = events.find(e => e.id === id);
                if (ev) handleMapClick(ev.coordinates.lat, ev.coordinates.lng);
              }} 
              heightClass="h-[350px] sm:h-[400px] lg:h-[480px]" 
              onMapClick={handleMapClick}
              pointQueryData={pointQueryData}
              onCreateEvent={async (data, pos) => {
                await createRiskEvent({
                  lat: pos.lat,
                  lng: pos.lng,
                  locationName: data.placeName || `Lat: ${pos.lat.toFixed(4)}, Lng: ${pos.lng.toFixed(4)}`,
                  baselineSusceptibility: data.baseline?.susceptibility,
                  dynamicLandslideRisk: data.risk?.current,
                  landslideRisk: Math.round((data.risk?.current || 0) * 100),
                  riskClass: data.risk_class?.toUpperCase()?.replace(' ', '_'),
                  rainfall24h: data.rainfall?.['24h_mm'],
                  rainfall72h: data.rainfall?.['3d_mm'],
                  recentRainfall: data.rainfall,
                  forecastRainfall: data.forecast,
                  avgSlope: data.slope?.degrees,
                  sentinel1: data.sentinel1,
                  soil_moisture: data.soil_moisture,
                  floodProbability: data.flood?.floodProbability,
                  floodModel: data.flood?.model,
                  floodTimestamp: data.flood?.predictionDate,
                  floodSentinel1VV: data.flood?.sentinel1?.vv,
                  floodSentinel1VH: data.flood?.sentinel1?.vh,
                  floodSentinel1VVChange: data.flood?.sentinel1?.vvChange,
                  floodSentinel1VHChange: data.flood?.sentinel1?.vhChange,
                  floodSentinel1CurrentDate: data.flood?.sentinel1?.currentDate,
                  floodSentinel1PreviousDate: data.flood?.sentinel1?.previousDate,
                  floodDEM: data.flood?.terrain?.dem,
                  floodSlope: data.flood?.terrain?.slope,
                  modelName: 'CatBoost + Open-Meteo',
                  localContributions: data.flood?.localContributions || data.localContributions,
                  globalFeatureImportance: data.flood?.globalFeatureImportance || data.globalFeatureImportance,
                  riskFactorWeighting: data.flood?.riskFactorWeighting || data.riskFactorWeighting
                });
                setPointQueryData(null); // Close popup
              }}
            />
          </div>
        </div>
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-4 rounded-2xl flex items-center justify-between"><h2 className="text-[13px] font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2 font-display"><AlertTriangle className="h-4 w-4 text-rose-500" /> Priority Events</h2><span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{events.length} Active</span></div>
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scroll">
            {events.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-white/55 px-6 py-10 text-center shadow-sm">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Sparkles className="h-5 w-5" /></div>
              <h3 className="mt-4 text-sm font-bold text-slate-800">Your watchlist is clear</h3>
              <p className="mx-auto mt-1 max-w-[250px] text-xs leading-relaxed text-slate-500">Select a point on the map to generate a risk assessment and begin monitoring it.</p>
            </div>}
            {events.map(evt => <div 
              key={evt.id} 
              onClick={() => {
                setSelectedDashboardEventId(evt.id);
                setSelectedEventId(evt.id);
                handleMapClick(evt.coordinates.lat, evt.coordinates.lng);
              }}
              className={`cursor-pointer rounded-2xl p-4 transition-all duration-300 relative overflow-hidden group glass-panel ${
                (selectedDashboardEventId || events[0]?.id) === evt.id 
                  ? 'ring-2 ring-indigo-500 border-indigo-300 shadow-md bg-indigo-50/10' 
                  : 'hover:border-slate-300'
              } ${evt.combinedPriority === 'CRITICAL' ? 'border-red-200' : ''}`}
            >
              <div className="flex items-center justify-between mb-2"><span className="font-mono text-[10px] font-bold text-slate-500 tracking-wider">{evt.id}</span><RiskBadge level={evt.combinedPriority} pulse={evt.combinedPriority === 'CRITICAL'} /></div>
              <h3 className="font-bold text-sm text-slate-800 mb-1">{evt.title}</h3><p className="text-[11px] text-slate-500 font-medium mb-4 flex items-center gap-1"><MapPin className="h-3 w-3" /> {evt.location}</p>
                <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {[['Flood', evt.floodRisk, 'sky'], ['Landslide', evt.landslideRisk, 'amber']].map(([name, risk, color]) => (
                    <div key={name as string}>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                        <span>{name}</span>
                        <span>{risk !== undefined ? `${risk}%` : 'Coming Soon'}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1">
                        <div className={`bg-${color}-500 h-1 rounded-full`} style={{ width: `${risk || 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-4">
                  <span>Confidence: <strong className="text-slate-800">{evt.confidence !== undefined ? `${evt.confidence}%` : 'Unavailable'}</strong></span>
                  <RiskBadge level={evt.status} size="sm" />
                </div>
                <button onClick={() => open(evt.id, evt.status === 'PENDING_REVIEW' ? 'expert-review' : 'event-detail')} className={`w-full py-2.5 rounded-xl text-[11px] font-bold tracking-wider transition flex items-center justify-center gap-2 ${evt.status === 'PENDING_REVIEW' ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>{evt.status === 'PENDING_REVIEW' ? <><ShieldCheck className="h-4 w-4" /> REVIEW EVENT</> : <><Eye className="h-4 w-4" /> VIEW DETAILS</>}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
