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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/40 flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden relative">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-8 pt-8 pb-6 relative z-10">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="bg-gradient-to-b from-indigo-50 to-white p-3 rounded-2xl shadow-sm border border-indigo-100/50 relative">
              <div className="absolute inset-0 bg-indigo-400/20 blur-xl rounded-full" />
              <ShieldCheck className="h-8 w-8 text-indigo-600 relative z-10" />
            </div>
            <div>
              <h2 className="font-black text-2xl text-slate-900 tracking-tight leading-none">SYSTEM DISPATCH</h2>
              <p className="text-indigo-600 text-[10px] font-bold mt-2 tracking-[0.2em] uppercase">Automated Alert Verification</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 space-y-6 relative z-10">
          
          <div className="space-y-3">
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm shadow-emerald-900/5 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
              <div className="bg-emerald-50 p-2 rounded-full shrink-0 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-800">Report {data.reportId} Verified</p>
                <p className="text-[11px] font-medium text-slate-500">Cross-validated by expert analyst</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-rose-100 shadow-sm shadow-rose-900/5 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
              <div className="bg-rose-50 p-2 rounded-full shrink-0 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-800">Public Alert {data.alertId} Generated</p>
                <p className="text-[11px] font-medium text-slate-500">Hazard warning now active</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
              <Send className="h-3 w-3 text-sky-500" /> Dispatching Messages
            </h3>
            
            <p className="text-[13px] text-center text-slate-500 mb-5 leading-relaxed px-4">
              Alerts have been routed to affected citizens within a <strong className="text-slate-800 font-bold border-b border-indigo-200">5 km radius</strong> of {data.location}.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200/60 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm">
                <MessageCircle className="h-5 w-5 text-emerald-500 mb-2 opacity-80" />
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-500 to-emerald-700 tracking-tight">
                  {data.whatsappSent.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">WhatsApp</span>
              </div>
              <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200/60 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm">
                <Mail className="h-5 w-5 text-rose-400 mb-2 opacity-80" />
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-400 to-rose-600 tracking-tight">
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
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/20 active:translate-y-0"
          >
            Acknowledge Dispatch
          </button>
        </div>
      </div>
    </div>
  );
};
