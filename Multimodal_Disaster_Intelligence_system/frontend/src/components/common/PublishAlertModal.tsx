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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden font-sans max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 text-white p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-[11px] font-semibold text-rose-200 mb-2">
            <Radio className="h-3.5 w-3.5 text-rose-400 animate-pulse" /> Targeted Area Dispatch Engine
          </div>
          <h2 className="text-xl font-black tracking-tight">
            Broadcast Emergency Alert & Dispatch Emails
          </h2>
          <p className="text-xs text-rose-200 mt-1">
            Publishing automatically dispatches emergency warning emails to all registered citizens and responders in the selected jurisdiction.
          </p>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {result ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="flex items-center gap-2 font-black text-sm text-emerald-800 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Alert Published & Targeted Emails Dispatched!
                </div>
                <p className="text-xs text-emerald-700">
                  {result.message}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b pb-1">
                  Dispatch Delivery Audit (MongoDB Atlas)
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Target Jurisdiction:</span>
                  <strong className="text-slate-900">{result.targetArea}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Emails Sent:</span>
                  <strong className="text-emerald-600 font-extrabold">{result.emailsDispatched} recipients</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Alert Record ID:</span>
                  <code className="text-slate-700 bg-white px-2 py-0.5 rounded border text-[10px]">
                    {result.alert?.alertId || 'ALT-ONLINE'}
                  </code>
                </div>

                <div className="pt-2 border-t mt-2">
                  <span className="text-slate-500 block mb-1 font-semibold text-[11px]">Delivered To Email Addresses:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(result.emailList || []).map((em: string, idx: number) => (
                      <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-indigo-200/60 flex items-center gap-1">
                        <Mail className="h-3 w-3 text-indigo-500" /> {em}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
                >
                  Publish Another Alert
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition shadow"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Area / Jurisdiction
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 bg-white font-medium"
                  >
                    {SECTORS.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec === 'ALL' ? '🚨 ALL SECTORS (State-Wide)' : `Sector: ${sec}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border font-black focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                      severity === 'CRITICAL'
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : severity === 'HIGH'
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    }`}
                  >
                    <option value="CRITICAL">CRITICAL (Red Alert - Evacuate)</option>
                    <option value="HIGH">HIGH (Orange Alert - Standby)</option>
                    <option value="MODERATE">MODERATE (Yellow Alert - Monitor)</option>
                    <option value="LOW">LOW (Green - Advisory)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alert Headline / Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Immediate Action & Safety Protocols</label>
                <textarea
                  value={safetyInstructions}
                  onChange={(e) => setSafetyInstructions(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recommended Safe Shelter</label>
                  <input
                    type="text"
                    value={shelter}
                    onChange={(e) => setShelter(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Safe Transit Route Advice</label>
                  <input
                    type="text"
                    value={routeAdvice}
                    onChange={(e) => setRouteAdvice(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Target Area Delivery Guarantee:</strong> All registered citizens in <strong>{area}</strong> will receive an emergency HTML notification email with evacuation instructions and emergency response hotlines (108 / 112).
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 hover:from-rose-700 hover:to-red-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-200 disabled:opacity-50"
              >
                {loading ? (
                  'Dispatching Emails & Broadcasting...'
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
