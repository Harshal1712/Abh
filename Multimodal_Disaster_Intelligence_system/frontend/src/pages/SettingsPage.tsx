import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Sliders, 
  CheckCircle2, 
  Lock,
  Save
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SettingsPage: React.FC = () => {
  const { dataSources, thresholds, updateThresholds } = useApp();

  const [floodCrit, setFloodCrit] = useState(thresholds.flood.critical);
  const [floodHigh, setFloodHigh] = useState(thresholds.flood.high);
  const [landslideCrit, setLandslideCrit] = useState(thresholds.landslide.critical);
  const [landslideHigh, setLandslideHigh] = useState(thresholds.landslide.high);
  
  const [expertApprovalReq] = useState(thresholds.expertApprovalRequired);
  const [autoVerifyReports, setAutoVerifyReports] = useState(thresholds.communityReportAutoVerify);

  const [savedToast, setSavedToast] = useState(false);

  const handleSaveThresholds = () => {
    updateThresholds({
      flood: { critical: floodCrit, high: floodHigh, moderate: 40, low: 0 },
      landslide: { critical: landslideCrit, high: landslideHigh, moderate: 40, low: 0 },
      expertApprovalRequired: expertApprovalReq,
      communityReportAutoVerify: autoVerifyReports
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast */}
      {savedToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-bounce">
          <CheckCircle2 className="h-6 w-6" />
          <div>
            <h4 className="font-bold text-xs">Settings Updated Successfully!</h4>
            <p className="text-[11px] text-emerald-100">Hazard prediction thresholds saved to localStorage.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-slate-700" /> Platform Configuration & Threshold Settings
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage connected telemetry feeds, hazard classification cutoffs, and safety governance policies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 1: CONNECTED DATA SOURCES */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Database className="h-4 w-4 text-sky-600" /> 1. Telemetry Data Source Integrations
            </h3>

            <div className="space-y-3">
              {dataSources.map((ds, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{ds.name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">{ds.type} • Refresh: {ds.frequency}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono mt-1">{ds.lastSync}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2: EDITABLE RISK THRESHOLDS & POLICY */}
        <div className="lg:col-span-6 space-y-6">
          {/* Risk Thresholds */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-5">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="h-4 w-4 text-purple-600" /> 2. Risk Classification Thresholds
            </h3>

            {/* FLOOD THRESHOLDS */}
            <div className="space-y-3">
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wider block">Flood Risk Index Cutoffs (%)</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-red-600 uppercase block mb-1">Critical (Red):</label>
                  <input
                    type="number"
                    value={floodCrit}
                    onChange={(e) => setFloodCrit(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-600 uppercase block mb-1">High (Orange):</label>
                  <input
                    type="number"
                    value={floodHigh}
                    onChange={(e) => setFloodHigh(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* LANDSLIDE THRESHOLDS */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wider block">Landslide Hazard Cutoffs (%)</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-red-600 uppercase block mb-1">Critical (Red):</label>
                  <input
                    type="number"
                    value={landslideCrit}
                    onChange={(e) => setLandslideCrit(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-600 uppercase block mb-1">High (Orange):</label>
                  <input
                    type="number"
                    value={landslideHigh}
                    onChange={(e) => setLandslideHigh(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: ALERT SAFETY POLICIES */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">3. Safety Governance Policies</h4>

              <div className="p-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold block flex items-center gap-1.5 text-emerald-700">
                    <Lock className="h-3.5 w-3.5" /> Expert Approval Required
                  </span>
                  <span className="text-[11px] text-slate-400">AI cannot bypass expert review to auto-publish alerts.</span>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white font-black rounded-lg text-xs">
                  ON (ENFORCED)
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Community Report Auto-Verification</span>
                  <span className="text-[11px] text-slate-500">Citizen observations require manual verification before updating ground truth index.</span>
                </div>
                <button
                  onClick={() => setAutoVerifyReports(!autoVerifyReports)}
                  className={`px-3 py-1 font-bold rounded-lg text-xs transition ${
                    autoVerifyReports ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {autoVerifyReports ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveThresholds}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
            >
              <Save className="h-4 w-4" /> Save Configuration Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
