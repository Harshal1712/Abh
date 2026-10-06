import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  Edit3,
  Clock,
  XCircle,
  BrainCircuit,
  FileText,
  Droplets,
  Users,
  CheckCircle2,
  Camera
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/common/RiskBadge';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

export const ExpertReviewPage: React.FC = () => {
  const {
    events,
    selectedEvent,
    setSelectedEventId,
    selectedEventId,
    approveEvent,
    holdEvent,
    rejectEvent,
    setActiveTab,
    communityReports
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [successToast, setSuccessToast] = useState(false);
  const [explanationText, setExplanationText] = useState<string>('Analyzing model rationale...');
  const [localImpact, setLocalImpact] = useState<any>(null);
  const [computingImpact, setComputingImpact] = useState(false);

  const currentEvent = selectedEvent || events[0];

  useEffect(() => {
    if (currentEvent) {
      const fetchExplanation = async () => {
        setExplanationText('Analyzing model rationale...');
        try {
          const payload = {
            hazard: currentEvent.primaryHazard === 'FLOOD' ? 'flood' : 'landslide',
            model: currentEvent.modelName || (currentEvent.primaryHazard === 'FLOOD' ? 'Flood CatBoost V1' : 'Landslide CatBoost'),
            prediction: Math.max(currentEvent.floodRisk || 0, currentEvent.landslideRisk || 0),
            features: {
              rainfall24h: currentEvent.rainfall24h,
              rainfall72h: currentEvent.rainfall72h,
              slope: currentEvent.avgSlope,
              baseline: currentEvent.baselineSusceptibility,
              s1vv: currentEvent.floodSentinel1VV,
              s1vh: currentEvent.floodSentinel1VH,
              s1change: currentEvent.floodSentinel1VVChange
            },
            localContributions: currentEvent.localContributions || null,
            riskFactorWeighting: currentEvent.riskFactorWeighting || null,
          };

          const res = await fetch('http://localhost:5000/api/risk/explanation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          const data = await res.json();
          setExplanationText(data.explanation || 'Explanation unavailable.');
        } catch (err) {
          setExplanationText('Model explanation is currently unavailable.');
        }
      };
      fetchExplanation();
    }
  }, [currentEvent]);

  useEffect(() => {
    setLocalImpact(null);
  }, [currentEvent?.id]);

  if (!currentEvent) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500 animate-pulse">Loading Review Data...</div>
      </div>
    );
  }

  const handleApproveConfirm = () => {
    approveEvent(currentEvent.id);
    setSuccessToast(true);
    setTimeout(() => {
      setActiveTab('alert-management');
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-bounce">
          <CheckCircle2 className="h-6 w-6" />
          <div>
            <h4 className="font-bold text-xs">Event Approved Successfully!</h4>
            <p className="text-[11px] text-emerald-100">Redirecting to Alert Management...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-purple-600" /> Expert Review & Validation Workbench
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Mandatory human-in-the-loop decision gate enforcing safety guidelines before alert publication.
          </p>
        </div>

        {/* Event Selection Switcher */}
        <select
          value={selectedEventId || ''}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
        >
          {events.map(e => (
            <option key={e.id} value={e.id}>
              {e.id} - {e.location} ({e.status})
            </option>
          ))}
        </select>
      </div>

      {/* Event Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-bold text-slate-400 block mb-1">SELECTED EVENT DOSSIER</span>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
            {currentEvent.title}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            District: <strong>{currentEvent.district}</strong> • Primary Hazard: <strong>{currentEvent.primaryHazard.replace('_', ' ')}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <RiskBadge level={currentEvent.status} size="lg" pulse={currentEvent.status === 'PENDING_REVIEW'} />
        </div>
      </div>

      {/* MAIN 4-PANEL DOSSIER GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PANEL 1: AI ASSESSMENT */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <BrainCircuit className="h-4 w-4 text-purple-600" /> 1. AI Assessment
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Flood Risk:</span>
              <strong className="text-sky-700 font-black">{currentEvent.floodRisk !== undefined ? `${currentEvent.floodRisk}%` : 'Coming Soon'}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Landslide Risk:</span>
              <strong className="text-amber-700 font-black">{currentEvent.landslideRisk}%</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Confidence:</span>
              <strong className="text-purple-700 font-black">{currentEvent.confidence !== undefined ? `${currentEvent.confidence}%` : 'Unavailable'}</strong>
            </div>

            <div className="flex justify-between py-1 pt-1">
              <span className="text-slate-500 font-medium">Combined Priority:</span>
              <RiskBadge level={currentEvent.combinedPriority} size="sm" />
            </div>
          </div>
        </div>

        {/* PANEL 2: EVIDENCE */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Droplets className="h-4 w-4 text-sky-600" /> 2. Telemetry Evidence
          </h3>

          <div className="space-y-1.5 text-xs text-slate-700 font-medium">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">24h Rainfall:</span>
              <strong className="text-slate-900 font-mono">{currentEvent.rainfall24h} mm</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">72h Rainfall:</span>
              <strong className="text-slate-900 font-mono">{currentEvent.rainfall72h} mm</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Topsoil Moisture:</span>
              <strong className="text-slate-900 font-mono">
                {currentEvent.soilMoisture !== undefined && currentEvent.soilMoisture !== null
                  ? `${currentEvent.soilMoisture} ${currentEvent.soilMoistureUnit || ''}`
                  : 'Unavailable'}
              </strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Average Slope:</span>
              <strong className="text-slate-900 font-mono">{currentEvent.avgSlope !== undefined ? `${currentEvent.avgSlope}°` : 'Unavailable'}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Historical Events:</span>
              <strong className="text-slate-900 font-mono">{currentEvent.historicalEventsCount}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Sentinel-1 Change:</span>
              <strong className="text-purple-700 font-bold">
                {currentEvent.sentinel1Change !== undefined && currentEvent.sentinel1Change !== null
                  ? `${currentEvent.sentinel1Change.toFixed(3)} dB`
                  : 'Unavailable'}
              </strong>
            </div>
            
            {/* Field Evidence */}
            {communityReports.filter(r => r.type === currentEvent.primaryHazard).length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1 border-t border-slate-100 pt-2"><Camera className="h-3 w-3" /> Field Evidence</span>
                <div className="bg-slate-50 rounded border border-slate-200 p-2 text-[10px]">
                  <p className="font-semibold text-slate-700 italic">"{communityReports.filter(r => r.type === currentEvent.primaryHazard)[0].description}"</p>
                  <p className="text-slate-400 mt-1">Reported by Citizen at {communityReports.filter(r => r.type === currentEvent.primaryHazard)[0].location}</p>
                  {communityReports.filter(r => r.type === currentEvent.primaryHazard)[0].photoUrl && (
                     <div className="mt-2 rounded overflow-hidden border border-slate-200 bg-white aspect-video relative flex items-center justify-center">
                       <img 
                         src={communityReports.filter(r => r.type === currentEvent.primaryHazard)[0].photoUrl!.startsWith('http') 
                           ? communityReports.filter(r => r.type === currentEvent.primaryHazard)[0].photoUrl 
                           : `http://localhost:5000${communityReports.filter(r => r.type === currentEvent.primaryHazard)[0].photoUrl}`} 
                         alt="Field Evidence" 
                         className="w-full h-full object-cover" 
                       />
                     </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANEL 3: POTENTIAL IMPACT */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-rose-600" /> 3. Potential Impact
          </h3>

          <div className="space-y-2 text-xs">
            {localImpact ? (
              <>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Estimated Buildings:</span>
                  <strong className="text-slate-900 font-black text-sm">{localImpact.estimatedBuildingsAffected.toLocaleString()}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Affected Schools/Hospitals:</span>
                  <strong className="text-slate-900 font-black text-sm">
                    {localImpact.affectedSchools + localImpact.affectedHospitals} facilities
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Traffic / Route Status:</span>
                  <strong className="text-indigo-700 font-black text-sm">{localImpact.trafficStatus || 'Pending Generation'}</strong>
                </div>
              </>
            ) : currentEvent.estimatedBuildingsAffected !== undefined ? (
              <>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Estimated Buildings:</span>
                  <strong className="text-slate-900 font-black text-sm">{currentEvent.estimatedBuildingsAffected.toLocaleString()}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Affected Schools/Hospitals:</span>
                  <strong className="text-slate-900 font-black text-sm">
                    {(currentEvent.affectedSchools || 0) + (currentEvent.affectedHospitals || 0)} facilities
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Traffic / Route Status:</span>
                  <strong className="text-indigo-700 font-black text-sm">{currentEvent.trafficStatus || 'Pending Generation'}</strong>
                </div>
              </>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center flex flex-col items-center justify-center gap-2">
                <span className="text-slate-500 font-medium italic block mb-1">Impact data has not been computed.</span>
                <button 
                  onClick={async () => {
                    setComputingImpact(true);
                    try {
                      const res = await fetch('/api/impact/assess-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ riskEventId: currentEvent.id })
                      });
                      const data = await res.json();
                      if (data.data) {
                        setLocalImpact({
                          estimatedBuildingsAffected: data.data.estimatedBuildingsAffected,
                          affectedSchools: data.data.affectedSchools,
                          affectedHospitals: data.data.affectedHospitals,
                          trafficStatus: data.data.trafficStatus
                        });
                      }
                    } catch (e) {}
                    setComputingImpact(false);
                  }}
                  disabled={computingImpact}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition text-xs shadow-md disabled:opacity-50"
                >
                  {computingImpact ? 'Computing GIS Intersections...' : 'Compute Infrastructure Impact'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PANEL 4: AI EXPLANATION */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-purple-600" /> 4. AI Explanation
          </h3>

          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs font-medium text-slate-800 leading-relaxed italic">
            "{explanationText}"
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Generated by Multi-Hazard Diagnostic Pipeline v2.4
          </p>
        </div>
      </div>

      {/* SECTION 5: EXPERT DECISION PANEL */}
      <div className="bg-white text-slate-800 p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" /> 5. Expert Decision & Validation Panel
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select sign-off action. Public alert issuance requires explicit analyst authorization.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Reviewer ID</span>
            <span className="text-xs font-bold text-sky-700">Dr. Ananya Sharma</span>
          </div>
        </div>

        {/* 4 Large Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* 1. APPROVE ALERT */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg transition flex flex-col items-center justify-center text-center gap-2 group border border-emerald-400/40"
          >
            <CheckCircle className="h-8 w-8 text-emerald-100 group-hover:scale-110 transition-transform" />
            <div>
              <span className="font-extrabold text-sm block">APPROVE ALERT</span>
              <span className="text-[11px] text-emerald-100 block font-normal">Authorize public alert issuance</span>
            </div>
          </button>

          {/* 2. MODIFY ALERT */}
          <button
            onClick={() => {
              approveEvent(currentEvent.id);
              setActiveTab('alert-management');
            }}
            className="p-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white shadow-lg transition flex flex-col items-center justify-center text-center gap-2 group border border-sky-400/40"
          >
            <Edit3 className="h-8 w-8 text-sky-100 group-hover:scale-110 transition-transform" />
            <div>
              <span className="font-extrabold text-sm block">MODIFY ALERT</span>
              <span className="text-[11px] text-sky-100 block font-normal">Edit text & threshold before approve</span>
            </div>
          </button>

          {/* 3. HOLD FOR REVIEW */}
          <button
            onClick={async () => {
              await holdEvent(currentEvent.id);
              setActiveTab('dashboard');
            }}
            className="p-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-lg transition flex flex-col items-center justify-center text-center gap-2 group border border-amber-400/40"
          >
            <Clock className="h-8 w-8 text-amber-100 group-hover:scale-110 transition-transform" />
            <div>
              <span className="font-extrabold text-sm block">HOLD FOR REVIEW</span>
              <span className="text-[11px] text-amber-100 block font-normal">Await secondary ground data</span>
            </div>
          </button>

          {/* 4. REJECT EVENT */}
          <button
            onClick={() => {
              setIsRejectModalOpen(true);
            }}
            className="p-4 rounded-xl bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white shadow-lg transition flex flex-col items-center justify-center text-center gap-2 group border border-rose-500/40"
          >
            <XCircle className="h-8 w-8 text-rose-100 group-hover:scale-110 transition-transform" />
            <div>
              <span className="font-extrabold text-sm block">REJECT EVENT</span>
              <span className="text-[11px] text-rose-100 block font-normal">Dismiss false positive detection</span>
            </div>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleApproveConfirm}
        title="Approve Community Alert?"
        subtitle="Final verification before publishing to public channels."
        affectedArea={currentEvent.location}
        hazard={currentEvent.primaryHazard === 'MULTI_HAZARD' ? 'Flood + Landslide' : currentEvent.primaryHazard}
        alertLevel={currentEvent.combinedPriority}
        messagePreview={`High flood and landslide risk has been identified for your area following expert review. Please remain alert and follow instructions issued by local authorities.`}
      />

      {/* Reject Reason Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-rose-50 p-6 border-b border-rose-100 flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm text-rose-600">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-rose-900 leading-tight">Reject Risk Event</h3>
                <p className="text-xs text-rose-700/80 font-medium mt-1">Please provide a reason for dismissing this alert.</p>
              </div>
            </div>
            
            <div className="p-6">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                Rejection Reason
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., False positive, outdated imagery, ground truth verified safe..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-shadow min-h-[120px]"
              />
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectReason('');
                }}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200/50 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!rejectReason.trim()) return;
                  await rejectEvent(currentEvent.id, rejectReason);
                  setIsRejectModalOpen(false);
                  setRejectReason('');
                  setActiveTab('dashboard');
                }}
                disabled={!rejectReason.trim()}
                className="px-6 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
