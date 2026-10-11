import React, { useState } from 'react';
import { X, Send, AlertTriangle, Mail, CheckCircle2, Radio } from 'lucide-react';

const SECTORS = [
  'Kamrup',
  'Guwahati',
  'Dibrugarh',
  'Tezpur',
  'Barpeta',
  'Nagaon',
  'Cachar (Silchar)',
  'ALL',
];

interface PublishAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertPublished?: (data: any) => void;
  initialArea?: string;
  initialTitle?: string;
  initialSeverity?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  initialInstructions?: string;
}

export const PublishAlertModal: React.FC<PublishAlertModalProps> = ({
  isOpen,
  onClose,
  onAlertPublished,
  initialArea,
  initialTitle,
  initialSeverity,
  initialInstructions,
}) => {
  const [area, setArea] = useState('Kamrup');
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'>('CRITICAL');
  const [title, setTitle] = useState('Immediate Riverine Flood Surge & Inundation Warning');
  const [hazardType] = useState('Flash Flood & River Inundation');
  const [safetyInstructions, setSafetyInstructions] = useState(
    'River gauge level at 2.45m exceeding flood crest. Severe waterlogging along lowland corridor. Evacuate immediately to highland relief facilities.'
  );
  const [shelter, setShelter] = useState('Kamrup District Multi-Purpose Evacuation Shelter');
  const [routeAdvice, setRouteAdvice] = useState('Elevated Highland Bypass Corridor (Avoid NH-27 underpasses)');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialArea) setArea(initialArea.includes('Kamrup') ? 'Kamrup' : initialArea.split(' ')[0]);
      if (initialTitle) setTitle(initialTitle);
      if (initialSeverity) setSeverity(initialSeverity);
      if (initialInstructions) setSafetyInstructions(initialInstructions);
      setResult(null);
    }
  }, [isOpen, initialArea, initialTitle, initialSeverity, initialInstructions]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/alerts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          severity,
          hazardType,
          area,
          location: `${area} Disaster Response Zone`,
          recipientEmail: 'hjkhairnar2104@gmail.com',
          safetyInstructions,
          travelAdvisory: routeAdvice,
          shelterRecommendation: shelter,
          routeAdvice,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch alert');

      setResult(data);
      if (onAlertPublished) onAlertPublished(data);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-slate-700/80 overflow-hidden font-sans max-h-[92vh] flex flex-col text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950 text-white p-5 sm:p-6 relative shrink-0 border-b border-rose-500/20">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/10 transition-all hover:scale-105"
            title="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-[11px] font-semibold text-rose-300 mb-2 shadow-sm">
            <Radio className="h-3.5 w-3.5 text-rose-400 animate-pulse" /> Targeted Area Dispatch Engine
          </div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            Broadcast Emergency Alert & Dispatch Emails
          </h2>
          <p className="text-xs text-slate-300/90 mt-1 leading-relaxed">
            Publishing automatically dispatches emergency warning emails to all registered citizens and responders in the selected jurisdiction.
          </p>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-slate-900/70">
          {result ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 shadow-sm">
                <div className="flex items-center gap-2 font-black text-sm text-emerald-300 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  Alert Published & Targeted Emails Dispatched!
                </div>
                <p className="text-xs text-emerald-200/80">
                  {result.message}
                </p>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs space-y-2.5 shadow-inner">
                <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>Dispatch Delivery Audit</span>
                  <span className="text-[10px] text-emerald-400 font-mono tracking-normal">MongoDB Atlas Live</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Target Jurisdiction:</span>
                  <strong className="text-slate-100 font-bold">{result.targetArea}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Emails Sent:</span>
                  <strong className="text-emerald-400 font-extrabold">{result.emailsDispatched} recipients</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Alert Record ID:</span>
                  <code className="text-sky-300 bg-sky-950/80 border border-sky-800/60 px-2 py-0.5 rounded font-mono text-[10px]">
                    {result.alert?.alertId || 'ALT-ONLINE'}
                  </code>
                </div>

                <div className="pt-2">
                  <span className="text-slate-400 block mb-1.5 font-semibold text-[11px]">Delivered To Email Addresses:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {(result.emailList || []).map((em: string, idx: number) => (
                      <span key={idx} className="bg-indigo-950/70 text-indigo-200 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-indigo-700/50 flex items-center gap-1.5 shadow-xs">
                        <Mail className="h-3 w-3 text-indigo-400" /> {em}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs transition active:scale-[0.99] cursor-pointer"
                >
                  Publish Another Alert
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-rose-950/50 active:scale-[0.99] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Target Area / Jurisdiction
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 bg-slate-950 text-slate-100 font-semibold shadow-inner cursor-pointer"
                  >
                    {SECTORS.map((sec) => (
                      <option key={sec} value={sec} className="bg-slate-900 text-slate-100 py-1.5 font-medium">
                        {sec === 'ALL' ? '🚨 ALL SECTORS (State-Wide)' : `Sector: ${sec}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/50 cursor-pointer shadow-inner transition-colors ${
                      severity === 'CRITICAL'
                        ? 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                        : severity === 'HIGH'
                        ? 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                        : severity === 'MODERATE'
                        ? 'bg-yellow-950/80 border-yellow-500/60 text-yellow-200'
                        : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                    }`}
                  >
                    <option value="CRITICAL" className="bg-slate-900 text-rose-300 font-bold py-1.5">CRITICAL (Red Alert - Evacuate)</option>
                    <option value="HIGH" className="bg-slate-900 text-amber-300 font-bold py-1.5">HIGH (Orange Alert - Standby)</option>
                    <option value="MODERATE" className="bg-slate-900 text-yellow-300 font-bold py-1.5">MODERATE (Yellow Alert - Monitor)</option>
                    <option value="LOW" className="bg-slate-900 text-emerald-300 font-bold py-1.5">LOW (Green - Advisory)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Alert Headline / Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700/80 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 font-semibold shadow-inner transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Immediate Action & Safety Protocols</label>
                <textarea
                  value={safetyInstructions}
                  onChange={(e) => setSafetyInstructions(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700/80 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 leading-relaxed shadow-inner transition resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Recommended Safe Shelter</label>
                  <input
                    type="text"
                    value={shelter}
                    onChange={(e) => setShelter(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700/80 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 shadow-inner transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Safe Transit Route Advice</label>
                  <input
                    type="text"
                    value={routeAdvice}
                    onChange={(e) => setRouteAdvice(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700/80 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 shadow-inner transition"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-amber-950/30 rounded-xl border border-amber-500/40 text-[11px] text-amber-200/90 flex items-start gap-2.5 shadow-sm">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-amber-300 font-bold">Target Area Delivery Guarantee:</strong> All registered citizens in <span className="font-bold text-white underline decoration-amber-500/60">{area}</span> will receive an emergency HTML notification email with evacuation instructions and emergency response hotlines (108 / 112).
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 hover:from-rose-500 hover:to-red-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-950/60 hover:shadow-rose-900/80 active:scale-[0.99] disabled:opacity-50 cursor-pointer border border-rose-500/40"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Radio className="h-4 w-4 animate-spin text-white" /> Dispatching Emails & Broadcasting...
                  </span>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Publish Alert & Send Emails to {area}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
