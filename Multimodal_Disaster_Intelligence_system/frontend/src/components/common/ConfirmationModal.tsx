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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl border border-rose-100 shadow-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-900 tracking-tight leading-none">{title}</h3>
              {subtitle && <p className="text-slate-500 text-xs font-medium mt-1.5">{subtitle}</p>}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors relative z-10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <div className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-4 flex items-start gap-3 text-rose-900 text-xs font-medium">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Expert verification is complete. Upon confirmation, this alert will transition to status <strong className="font-bold">APPROVED</strong> and move directly to Alert Management for public publication.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-widest mb-1">Affected Area</span>
              <span className="font-bold text-slate-800 text-sm">{affectedArea}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-widest mb-1">Hazard Type</span>
              <span className="font-bold text-slate-800 text-sm">{hazard}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-widest mb-1">Alert Severity</span>
              <span className="inline-flex mt-0.5 px-2 py-0.5 bg-rose-100 text-rose-700 font-bold rounded-md text-xs shadow-sm border border-rose-200">
                {alertLevel}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-widest mb-1">Expert Sign-Off</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5 text-sm">
                <CheckCircle className="h-4 w-4" /> Verified
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Approved Alert Message Preview
            </label>
            <div className="p-4 bg-slate-50 text-slate-700 text-sm rounded-2xl font-medium leading-relaxed border border-slate-200 shadow-sm relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-2xl" />
              "{messagePreview}"
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Check className="h-4 w-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
