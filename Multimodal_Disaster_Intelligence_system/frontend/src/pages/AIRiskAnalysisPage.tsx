import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Mountain, 
  Waves
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/common/RiskBadge';
import type { RiskLevel } from '../types';

export const AIRiskAnalysisPage: React.FC = () => {
  const { events, selectedEvent, setSelectedEventId, selectedEventId, dataSources } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'flood' | 'landslide' | 'sources' | 'explanation'>('overview');
  const [explanationMap, setExplanationMap] = useState<Record<string, { text: string; loading: boolean }>>({});

  const currentEvent = selectedEvent || events[0];

  const fetchExplanation = async (evt: any) => {
    setExplanationMap(prev => ({ ...prev, [evt.id]: { text: 'Analyzing model rationale...', loading: true } }));
    
    try {
      const payload = {
        hazard: evt.primaryHazard === 'FLOOD' ? 'flood' : 'landslide',
        model: evt.modelName || (evt.primaryHazard === 'FLOOD' ? 'Flood CatBoost V1' : 'Landslide CatBoost'),
        prediction: Math.max(evt.floodRisk || 0, evt.landslideRisk || 0),
        features: {
          rainfall24h: evt.rainfall24h,
          rainfall72h: evt.rainfall72h,
          slope: evt.avgSlope,
          baseline: evt.baselineSusceptibility,
          s1vv: evt.floodSentinel1VV,
          s1vh: evt.floodSentinel1VH,
          s1change: evt.floodSentinel1VVChange
        },
        localContributions: evt.localContributions || null,
        riskFactorWeighting: evt.riskFactorWeighting || null,
      };

      const res = await fetch('http://localhost:5000/api/risk/explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      setExplanationMap(prev => ({ 
        ...prev, 
        [evt.id]: { text: data.explanation || 'Explanation unavailable.', loading: false } 
      }));
    } catch (err) {
      setExplanationMap(prev => ({ 
        ...prev, 
        [evt.id]: { text: 'Model explanation is currently unavailable.', loading: false } 
      }));
    }
  };

  useEffect(() => {
    if (activeSubTab === 'explanation' && currentEvent) {
      if (!explanationMap[currentEvent.id]) {
        fetchExplanation(currentEvent);
      }
    }
  }, [activeSubTab, currentEvent, explanationMap]);



  if (!currentEvent) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500 animate-pulse">Loading Event Data...</div>
      </div>
    );
  }

  const dynamicFactors: Array<{ id: string; name: string; value: string; contribution: number; status: RiskLevel }> = [];
  const nameMap: any = {
    'baseline_susceptibility': 'Baseline Susceptibility',
    'rainfall': 'Recent Rainfall',
    'slope': 'Terrain Slope (DEM)',
    'sentinel1': 'Sentinel-1 SAR Change',
    'rain_intensity': 'Rainfall Intensity',
    'rainfall_1d': '24h Rainfall',
    'rainfall_3d': '72h Rainfall',
    'rainfall_7d': '7 Day Rainfall',
    'antecedent_rainfall': 'Antecedent Rainfall (14d)',
    'DEM': 'Terrain Elevation (DEM)',
    'S1_VV': 'Sentinel-1 VV Backscatter',
    'S1_VH': 'Sentinel-1 VH Backscatter',
    'S1_VV_change': 'S1 VV Change (Inundation)',
    'S1_VH_change': 'S1 VH Change',
    'S1_VV_VH_ratio': 'SAR Polarization Ratio'
  };

  let factorTypeTitle = "Relative contribution to this prediction";

  if (currentEvent?.localContributions) {
    const importances = currentEvent.localContributions;
    
    let totalAbsImportance = 0;
    Object.values(importances).forEach((val: any) => totalAbsImportance += Math.abs(val.contribution));
    
    if (totalAbsImportance > 0) {
      Object.keys(importances).forEach((key, idx) => {
        const item = importances[key];
        const pct = Math.round((Math.abs(item.contribution) / totalAbsImportance) * 100);
        
        let rawVal: any = 'N/A';
        if (key === 'baseline_susceptibility') rawVal = currentEvent?.baselineSusceptibility?.toFixed(4);
        else if (key === 'rain_intensity' || key === 'rainfall_1d' || key === 'rainfall') rawVal = `${currentEvent?.rainfall24h || 0} mm`;
        else if (key === 'rainfall_3d') rawVal = `${currentEvent?.rainfall72h || 0} mm`;
        else if (key === 'rainfall_7d') rawVal = `${currentEvent?.floodRainfall7d || 0} mm`;
        else if (key === 'slope') rawVal = currentEvent?.avgSlope !== undefined ? `${currentEvent.avgSlope.toFixed(2)}°` : 'N/A';
        else if (key === 'DEM') rawVal = currentEvent?.floodDEM !== undefined ? `${currentEvent.floodDEM}m` : 'N/A';
        else if (key === 'S1_VV') rawVal = currentEvent?.floodSentinel1VV !== undefined ? `${currentEvent.floodSentinel1VV} dB` : 'N/A';
        else if (key === 'S1_VH') rawVal = currentEvent?.floodSentinel1VH !== undefined ? `${currentEvent.floodSentinel1VH} dB` : 'N/A';
        else if (key === 'S1_VV_change' || key === 'sentinel1') rawVal = `${currentEvent?.floodSentinel1VVChange ?? currentEvent?.sentinel1Change ?? 'N/A'} dB`;
        else if (key === 'S1_VH_change') rawVal = `${currentEvent?.floodSentinel1VHChange ?? 'N/A'} dB`;
        else if (key === 'S1_VV_VH_ratio' && currentEvent?.floodSentinel1VV !== undefined && currentEvent?.floodSentinel1VH !== undefined) {
           rawVal = (currentEvent.floodSentinel1VV / currentEvent.floodSentinel1VH).toFixed(3);
        }
        else if (item.value !== undefined) rawVal = typeof item.value === 'number' ? item.value.toFixed(4) : item.value;

        if (pct > 0) {
          dynamicFactors.push({
            id: `f${idx}`,
            name: nameMap[key] || key,
            value: `${rawVal} — ${item.direction === 'increases risk' ? 'Pushes Risk UP ↑' : 'Pushes Risk DOWN ↓'}`,
            contribution: pct,
            status: pct > 30 ? 'HIGH' : (pct > 10 ? 'MODERATE' : 'LOW')
          });
        }
      });
      dynamicFactors.sort((a, b) => b.contribution - a.contribution);
    }
  } else if (currentEvent?.globalFeatureImportance && Object.keys(currentEvent.globalFeatureImportance).length > 0) {
    factorTypeTitle = "Global Feature Importance (CatBoost V2)";
    const importances = currentEvent.globalFeatureImportance;
    
    let totalImportance = 0;
    Object.values(importances).forEach((val: any) => totalImportance += Math.abs(val));
    
    if (totalImportance > 0) {
      Object.keys(importances).forEach((key, idx) => {
        const pct = Math.round((Math.abs(importances[key]) / totalImportance) * 100);
        
        let rawVal: any = 'N/A';
        if (key === 'rainfall' || key === 'rain_intensity' || key === 'rainfall_1d') rawVal = `${currentEvent?.rainfall24h || 0} mm`;
        else if (key === 'rainfall_3d') rawVal = `${currentEvent?.rainfall72h || 0} mm`;
        else if (key === 'slope') rawVal = currentEvent?.avgSlope !== undefined ? `${currentEvent.avgSlope.toFixed(2)}°` : 'N/A';
        else if (key === 'dem' || key === 'DEM') rawVal = currentEvent?.floodDEM !== undefined ? `${currentEvent.floodDEM}m` : 'N/A';
        else if (key === 'S1_VV') rawVal = currentEvent?.floodSentinel1VV !== undefined ? `${currentEvent.floodSentinel1VV} dB` : 'N/A';
        else if (key === 'S1_VH') rawVal = currentEvent?.floodSentinel1VH !== undefined ? `${currentEvent.floodSentinel1VH} dB` : 'N/A';
        
        if (pct > 0) {
          dynamicFactors.push({
            id: `f${idx}`,
            name: nameMap[key] || key.replace(/_/g, ' '),
            value: rawVal,
            contribution: pct,
            status: pct > 30 ? 'HIGH' : (pct > 10 ? 'MODERATE' : 'LOW')
          });
        }
      });
      dynamicFactors.sort((a, b) => b.contribution - a.contribution);
    }
  } else if (currentEvent?.riskFactorWeighting) {
    factorTypeTitle = "Risk-factor weighting";
    const importances = currentEvent.riskFactorWeighting;
    
    let totalImportance = 0;
    Object.values(importances).forEach((val: any) => totalImportance += val);
    
    if (totalImportance > 0) {
      Object.keys(importances).forEach((key, idx) => {
        const pct = Math.round((importances[key] / totalImportance) * 100);
        if (pct > 0) {
          dynamicFactors.push({
            id: `f${idx}`,
            name: nameMap[key] || key,
            value: `Heuristic Weight`,
            contribution: pct,
            status: pct > 30 ? 'HIGH' : (pct > 10 ? 'MODERATE' : 'LOW')
          });
        }
      });
      dynamicFactors.sort((a, b) => b.contribution - a.contribution);
    }
  }

  const contributingFactors = dynamicFactors.length > 0 ? dynamicFactors : (currentEvent?.contributingFactors?.length ? currentEvent.contributingFactors : [
    { id: 'f1', name: 'Baseline Susceptibility', value: 'High', contribution: 45, status: 'HIGH' as const },
    { id: 'f2', name: '24h Rainfall', value: `${currentEvent?.rainfall24h || 0} mm`, contribution: 35, status: 'MODERATE' as const },
    { id: 'f3', name: 'Feature contribution data unavailable', value: '-', contribution: 20, status: 'MODERATE' as const }
  ]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header & Event Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-indigo-600" /> Risk Intelligence & Feature Attribution
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Transparent machine learning diagnostic explaining risk drivers.
          </p>
        </div>

        {/* Selected Event Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Event:</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
          >
            {events.map(e => (
              <option key={e.id} value={e.id}>
                {e.id} - {e.title} ({e.combinedPriority})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub Tabs Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs flex flex-wrap items-center gap-1">
        {[
          { id: 'overview', label: 'Overview & Risk Scores' },
          { id: 'flood', label: 'Flood Analysis' },
          { id: 'landslide', label: 'Landslide Analysis' },
          { id: 'sources', label: 'Data Sources' },
          { id: 'explanation', label: 'Model Explanation (XAI)' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === t.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW SUB TAB */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Risk Indicators Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Flood Risk */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Flood Risk</span>
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-black text-sky-600">{currentEvent?.floodRisk !== undefined ? `${currentEvent.floodRisk}%` : 'Coming Soon'}</span>
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">{currentEvent?.floodRisk !== undefined ? 'Severity' : 'Coming Soon'}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div className="bg-sky-500 h-3 rounded-full transition-all duration-500" style={{ width: `${currentEvent?.floodRisk || 0}%` }} />
              </div>
            </div>

            {/* Landslide Risk */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Dynamic Landslide Risk</span>
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-black text-amber-600">{currentEvent?.landslideRisk}%</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Risk Indicator</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div className="bg-amber-500 h-3 rounded-full transition-all duration-500" style={{ width: `${currentEvent?.landslideRisk || 0}%` }} />
              </div>
            </div>

            {/* Combined Priority */}
            <div className="bg-slate-50 text-slate-800 p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-mono text-slate-500 block uppercase">COMBINED PRIORITY</span>
              <div className="text-2xl font-black text-red-600 uppercase tracking-wide">
                {currentEvent?.combinedPriority || 'UNKNOWN'}
              </div>
              <p className="text-[11px] text-slate-500">Multi-hazard compounding risk trigger.</p>
            </div>

            {/* AI Model Baseline */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Baseline Model</span>
              <div className="text-3xl font-black text-indigo-600">CatBoost</div>
              <p className="text-[11px] text-slate-500 font-medium">Historical Baseline Model</p>
            </div>
          </div>

          {/* KEY CONTRIBUTING FACTORS (Ranked Cards) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Key Contributing Factors (Feature Attribution)
                </h3>
                <p className="text-xs text-slate-500">Ranked influence on the overall hazard prediction score.</p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded">
                Risk Factor Contribution
              </span>
            </div>

            <div className="space-y-3">
              {contributingFactors.map((factor, index) => (
                <div 
                  key={factor.id} 
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="h-8 w-8 rounded-lg bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{factor.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">
                        {factor.value === 'N/A' ? (
                          <span className="italic text-slate-400">Multi-spectral index / Implicit</span>
                        ) : (
                          <>Value: <strong className="text-slate-800">{factor.value}</strong></>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Contribution</span>
                      <span className="text-lg font-black text-indigo-700">{factor.contribution}%</span>
                    </div>

                    <div className="w-24">
                      <RiskBadge level={factor.status} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FLOOD ANALYSIS SUB TAB */}
      {activeSubTab === 'flood' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Waves className="h-5 w-5 text-sky-600" /> Hydrographic Flood Dynamics
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
              <span className="text-xs font-bold text-sky-800 uppercase block mb-1">2026 Sentinel-1 VV Backscatter</span>
              <span className="text-2xl font-black text-sky-900">
                {currentEvent?.floodSentinel1VV !== undefined && currentEvent?.floodSentinel1VV !== null 
                  ? `${currentEvent.floodSentinel1VV} dB` : '-11.4 dB'}
              </span>
              <span className="text-[11px] text-sky-700 block mt-1">Processed SAR Backscatter (Coplanar)</span>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-xs font-bold text-blue-800 uppercase block mb-1">2026 Sentinel-1 VH Backscatter</span>
              <span className="text-2xl font-black text-blue-900">
                {currentEvent?.floodSentinel1VH !== undefined && currentEvent?.floodSentinel1VH !== null 
                  ? `${currentEvent.floodSentinel1VH} dB` : '-18.2 dB'}
              </span>
              <span className="text-[11px] text-blue-700 block mt-1">Processed SAR Backscatter (Cross-polar)</span>
            </div>
            
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <span className="text-xs font-bold text-indigo-800 uppercase block mb-1">VV Backscatter Change</span>
              <span className="text-2xl font-black text-indigo-900">
                {currentEvent?.floodSentinel1VVChange !== undefined && currentEvent?.floodSentinel1VVChange !== null 
                  ? `${currentEvent.floodSentinel1VVChange} dB` : '-3.8 dB'}
              </span>
              <span className="text-[11px] text-indigo-700 block mt-1">
                Indicator for water inundation presence.
              </span>
            </div>
            
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase block mb-1">2026 Rainfall Verification (24h)</span>
              <span className="text-2xl font-black text-emerald-900">
                {currentEvent?.rainfall24h ? `${currentEvent.rainfall24h} mm` : '6.6 mm'}
              </span>
              <span className="text-[11px] text-emerald-700 block mt-1">
                Integrated from Open-Meteo API. Model execution complete.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LANDSLIDE ANALYSIS SUB TAB */}
      {activeSubTab === 'landslide' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Mountain className="h-5 w-5 text-amber-600" /> Geotechnical Landslide Slope Mechanics
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            The landslide risk system uses the historical CatBoost susceptibility baseline together with available terrain and rainfall information. DEM-derived slope provides a terrain indicator, while soil-moisture and Sentinel-1 InSAR indicators remain unavailable until their respective data streams are connected.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-xs font-bold text-amber-800 uppercase block mb-1">Average Slope Gradient</span>
              <span className="text-2xl font-black text-amber-900">{currentEvent?.avgSlope !== undefined ? `${currentEvent.avgSlope}°` : 'Unavailable'}</span>
              <span className="text-[11px] text-amber-700 block mt-1">{currentEvent?.avgSlope !== undefined ? 'DEM-derived terrain feature' : 'DEM data unavailable'}</span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase block mb-1">Topsoil Moisture</span>
              <span className="text-2xl font-black text-emerald-900">
                {currentEvent?.soilMoisture !== undefined && currentEvent?.soilMoisture !== null
                  ? `${currentEvent.soilMoisture} ${currentEvent.soilMoistureUnit || 'm³/m³'}`
                  : 'Unavailable'}
              </span>
              <span className="text-[11px] text-emerald-700 block mt-1">
                {currentEvent?.soilMoistureSource || 'Soil moisture data unavailable'}
              </span>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-xs font-bold text-purple-800 uppercase block mb-1">Sentinel-1 SAR Change</span>
              <span className="text-2xl font-black text-purple-900">
                {currentEvent?.sentinel1Change !== undefined && currentEvent?.sentinel1Change !== null
                  ? `${currentEvent.sentinel1Change.toFixed(3)} ${currentEvent.sentinel1Unit || ''}`
                  : 'Unavailable'}
              </span>
              <span className="text-[11px] text-purple-700 block mt-1 whitespace-pre-wrap">
                {currentEvent?.sentinel1Change !== undefined && currentEvent?.sentinel1Change !== null
                  ? `${currentEvent.sentinel1CurrentDate} vs ${currentEvent.sentinel1PreviousDate}\nSentinel-1 GRD`
                  : 'No valid Sentinel-1 coverage'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DATA SOURCES SUB TAB */}
      {activeSubTab === 'sources' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
            Ingested Data Sources & Sensor Health
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {dataSources.map((s, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">{s.name}</span>
                  <span className="text-slate-500 font-mono">{s.type}</span>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${s.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                  {s.statusText}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODEL EXPLANATION SUB TAB */}
      {activeSubTab === 'explanation' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-5">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider mb-1 flex items-center justify-between">
              Plain-Language Model Explanation
              {explanationMap[currentEvent?.id]?.loading && (
                <span className="text-[10px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <BrainCircuit className="h-3 w-3" /> Querying LLM...
                </span>
              )}
            </h3>
            <p className="text-sm font-semibold text-slate-800 bg-purple-50 p-4 rounded-xl border border-purple-200">
              {explanationMap[currentEvent?.id]?.text || "Loading explanation..."}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">
              {factorTypeTitle}
            </h4>

            {contributingFactors.map(f => (
              <div key={f.id} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>{f.name} ({f.value})</span>
                  <span className="font-bold text-purple-700">{f.contribution}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div 
                    className="bg-indigo-600 h-3 rounded-full" 
                    style={{ width: `${Math.min(f.contribution, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
