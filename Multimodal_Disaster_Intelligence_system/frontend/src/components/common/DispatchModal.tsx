import React from 'react';
import { Send, CheckCircle2, AlertTriangle, ShieldCheck, Mail, MessageCircle } from 'lucide-react';

interface DispatchModalProps {
  data: {
    reportId: string;
    alertId: string;
    whatsappSent: number;
    emailSent: number;
    location: string;
  };
  onClose: () => void;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({ data, onClose }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900/95 text-slate-100 backdrop-blur-2xl rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-slate-700/80 flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden relative">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-8 pt-8 pb-6 relative z-10">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="bg-gradient-to-b from-indigo-950/60 to-slate-900 p-3 rounded-2xl shadow-inner border border-indigo-500/30 relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
              <ShieldCheck className="h-8 w-8 text-indigo-400 relative z-10" />
            </div>
            <div>
              <h2 className="font-black text-2xl text-white tracking-tight leading-none">SYSTEM DISPATCH</h2>
              <p className="text-indigo-400 text-[10px] font-bold mt-2 tracking-[0.2em] uppercase">Automated Alert Verification</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 space-y-6 relative z-10">
          
          <div className="space-y-3">
            <div className="flex items-center gap-4 bg-slate-950/70 p-4 rounded-2xl border border-emerald-500/30 shadow-sm relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
              <div className="bg-emerald-950/60 p-2 rounded-full shrink-0 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-100">Report {data.reportId} Verified</p>
                <p className="text-[11px] font-medium text-slate-400">Cross-validated by expert analyst</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/70 p-4 rounded-2xl border border-rose-500/30 shadow-sm relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
              <div className="bg-rose-950/60 p-2 rounded-full shrink-0 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-100">Public Alert {data.alertId} Generated</p>
                <p className="text-[11px] font-medium text-slate-400">Hazard warning now active</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
              <Send className="h-3 w-3 text-sky-400" /> Dispatching Messages
            </h3>
            
            <p className="text-[13px] text-center text-slate-300 mb-5 leading-relaxed px-4">
              Alerts have been routed to affected citizens within a <strong className="text-white font-bold border-b border-indigo-500/50">5 km radius</strong> of {data.location}.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-inner">
                <MessageCircle className="h-5 w-5 text-emerald-400 mb-2 opacity-90" />
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-emerald-200 tracking-tight">
                  {data.whatsappSent.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">WhatsApp</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-inner">
                <Mail className="h-5 w-5 text-rose-400 mb-2 opacity-90" />
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-400 to-rose-200 tracking-tight">
                  {data.emailSent.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">Gmail</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          <button 
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-2xl transition-all border border-slate-700 hover:border-slate-600 active:scale-[0.99] cursor-pointer"
          >
            Acknowledge Dispatch
          </button>
        </div>
      </div>
    </div>
  );
};
