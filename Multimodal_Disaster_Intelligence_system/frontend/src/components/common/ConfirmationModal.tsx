import React from 'react';
import { AlertTriangle, CheckCircle, X, ShieldAlert, Check } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtitle?: string;
  affectedArea: string;
  hazard: string;
  alertLevel: string;
  messagePreview: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  affectedArea,
  hazard,
  alertLevel,
  messagePreview,
  confirmText = 'Confirm & Proceed to Alert',
  cancelText = 'Cancel'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-slate-900/95 text-slate-100 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] overflow-hidden border border-slate-700/80 flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800 flex items-start justify-between relative overflow-hidden bg-slate-950/40">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-rose-500/10 text-rose-400 p-3 rounded-2xl border border-rose-500/20 shadow-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-black text-xl text-white tracking-tight leading-none">{title}</h3>
              {subtitle && <p className="text-slate-400 text-xs font-medium mt-1.5">{subtitle}</p>}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors relative z-10 border border-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 bg-slate-900/80">
          <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3 text-rose-200 text-xs font-medium">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Expert verification is complete. Upon confirmation, this alert will transition to status <strong className="font-bold text-rose-100">APPROVED</strong> and move directly to Alert Management for public publication.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-widest mb-1">Affected Area</span>
              <span className="font-bold text-slate-100 text-sm">{affectedArea}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-widest mb-1">Hazard Type</span>
              <span className="font-bold text-slate-100 text-sm">{hazard}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-widest mb-1">Alert Severity</span>
              <span className="inline-flex mt-0.5 px-2.5 py-0.5 bg-rose-950/80 text-rose-300 font-bold rounded-md text-xs shadow-sm border border-rose-600/50">
                {alertLevel}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-widest mb-1">Expert Sign-Off</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5 text-sm">
                <CheckCircle className="h-4 w-4" /> Verified
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Approved Alert Message Preview
            </label>
            <div className="p-4 bg-slate-950 text-slate-200 text-xs sm:text-sm rounded-2xl font-medium leading-relaxed border border-slate-800 shadow-inner relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-2xl" />
              "{messagePreview}"
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950/70 border-t border-slate-800 p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
