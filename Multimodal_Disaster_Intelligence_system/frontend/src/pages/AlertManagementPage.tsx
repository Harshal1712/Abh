import React, { useState } from 'react';
import {
  BellRing,
  Send,
  Eye,
  Languages,
  CheckCircle2,
  Smartphone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/common/RiskBadge';
import { PublishAlertModal } from '../components/common/PublishAlertModal';
import type { RiskLevel } from '../types';

export const AlertManagementPage: React.FC = () => {
  const { alerts, publishAlert, updateAlertContent, setUserRole } = useApp();
  const [activeTabFilter, setActiveTabFilter] = useState<'PENDING_PUBLISH' | 'APPROVED' | 'ACTIVE' | 'EXPIRED'>('PENDING_PUBLISH');

  const [selectedAlertId, setSelectedAlertId] = useState<string>(() => {
    return alerts.length > 0 ? alerts[0].id : '';
  });

  const [publishedToast, setPublishedToast] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  const filteredAlerts = alerts.filter(a => {
    if (activeTabFilter === 'PENDING_PUBLISH') {
      return ['DRAFT', 'PENDING_PUBLISH', 'PENDING_APPROVAL', 'APPROVED'].includes(a.status);
    }
    if (activeTabFilter === 'ACTIVE') {
      return ['SENT', 'PARTIAL', 'SENDING', 'ACTIVE'].includes(a.status);
    }
    return ['FAILED', 'CANCELLED', 'EXPIRED'].includes(a.status);
  });

  const currentAlert = alerts.find(a => a.id === selectedAlertId) || alerts[0];

  const handlePublish = async (id: string, isTest: boolean = false) => {
    publishAlert(id, isTest);
    try {
      const alertDoc = alerts.find(a => a.id === id);
      if (alertDoc) {
        await fetch('/api/alerts/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: alertDoc.title,
            severity: alertDoc.severity,
            hazardType: alertDoc.hazardType,
            area: alertDoc.affectedArea || alertDoc.location || 'Kamrup',
            location: alertDoc.location || alertDoc.affectedArea || 'Assam Sector',
            safetyInstructions: alertDoc.messageEn,
            travelAdvisory: 'Immediate travel advisory in effect. Avoid inundated road corridors.',
          }),
        });
      }
    } catch (e) {
      console.error('Failed to trigger area email dispatch:', e);
    }
    setPublishedToast(true);
    setTimeout(() => {
      setPublishedToast(false);
    }, 4000);
  };

  const handleViewInCitizenPortal = () => {
    setUserRole('CITIZEN');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Banner */}
      {publishedToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-bounce">
          <CheckCircle2 className="h-6 w-6" />
          <div>
            <h4 className="font-bold text-xs">Alert Successfully Published!</h4>
            <p className="text-[11px] text-emerald-100">Dispatched to Citizen Portal and broadcast relays.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BellRing className="h-6 w-6 text-amber-600" /> Community Alert Dispatch Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure multi-lingual message parameters, preview, and broadcast verified alerts to affected citizen portals.
          </p>
        </div>

        <button
          onClick={handleViewInCitizenPortal}
          className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-2 shadow-xs"
        >
          <Smartphone className="h-4 w-4" /> Open Citizen Portal View
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs flex flex-wrap items-center gap-1">
        {[
          { id: 'PENDING_PUBLISH', label: 'Approved & Ready to Publish' },
          { id: 'ACTIVE', label: 'Active Broadcasts' },
          { id: 'EXPIRED', label: 'Expired Archive' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTabFilter(t.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTabFilter === t.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* MAIN ALERT EDITOR & LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Alerts List Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs font-extrabold text-xs text-slate-900 uppercase tracking-wider">
            Alert Queue ({filteredAlerts.length})
          </div>

          <div className="space-y-2.5">
            {filteredAlerts.map(alt => (
              <div
                key={alt.id}
                onClick={() => setSelectedAlertId(alt.id)}
                className={`p-4 rounded-xl border transition cursor-pointer ${alt.id === currentAlert?.id
                    ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-slate-500">{alt.alertId || alt.id}</span>
                  <RiskBadge level={alt.severity} size="sm" pulse={alt.severity === 'CRITICAL'} />
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">{alt.title}</h4>
                <p className="text-xs text-slate-500 font-medium">{alt.affectedArea}</p>

                <div className="flex items-center justify-between mt-3 text-[11px]">
                  <span className="text-slate-400">Status: <strong className="text-slate-700">{alt.status}</strong></span>
                  {alt.status === 'PENDING_PUBLISH' && (
                    <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded">Ready</span>
                  )}
                </div>
              </div>
            ))}

            {filteredAlerts.length === 0 && (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                No alerts currently match this tab.
              </div>
            )}
          </div>
        </div>

        {/* Right: Alert Configuration & Publishing Form */}
        {currentAlert && (
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md space-y-6">
              {/* Alert Header Summary */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="font-mono text-xs text-slate-400 font-bold block">ALERT DOSSIER ID: {currentAlert.alertId || currentAlert.id}</span>
                  <h3 className="text-lg font-black text-slate-900">{currentAlert.title?.replace('undefined', 'Flood & Landslide') || 'Moderate Flood & Landslide Alert'}</h3>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-xs border border-amber-300">
                    {['SENT', 'PARTIAL', 'ACTIVE'].includes(currentAlert.status) ? 'BROADCASTING ACTIVE' : 'READY TO PUBLISH'}
                  </span>
                  {currentAlert.deliveryStats && (
                    <div className="text-[10px] text-slate-500 font-mono mt-1 text-right">
                      <div>WA: {currentAlert.deliveryStats.whatsapp.sent} sent, {currentAlert.deliveryStats.whatsapp.failed} failed</div>
                      <div>Email: {currentAlert.deliveryStats.email.sent} sent, {currentAlert.deliveryStats.email.failed} failed</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Input Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Alert Title</label>
                  <input
                    type="text"
                    value={currentAlert.title?.replace('undefined', 'Flood & Landslide')}
                    onChange={(e) => updateAlertContent(currentAlert.id, { title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Alert Severity</label>
                  <select
                    value={currentAlert.severity}
                    onChange={(e) => updateAlertContent(currentAlert.id, { severity: e.target.value as RiskLevel })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="CRITICAL">RED / CRITICAL</option>
                    <option value="HIGH">ORANGE / HIGH</option>
                    <option value="MODERATE">YELLOW / MODERATE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Affected Area</label>
                  <input
                    type="text"
                    value={currentAlert.affectedArea}
                    onChange={(e) => updateAlertContent(currentAlert.id, { affectedArea: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Expiry Window</label>
                  <input
                    type="text"
                    value={currentAlert.expiresAt}
                    onChange={(e) => updateAlertContent(currentAlert.id, { expiresAt: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Multilingual Alert Message Editor */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <label className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Languages className="h-4 w-4 text-sky-600" /> Multi-Lingual Broadcast Messages
                  </label>

                  <div className="flex items-center gap-1">
                    {(['en', 'hi', 'local'] as const).map(lang => (
                      <button
                        key={lang}
                        onClick={() => updateAlertContent(currentAlert.id, { selectedLanguage: lang })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition ${currentAlert.selectedLanguage === lang
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi (हिंदी)' : 'Assamese (অসমীয়া)'}
                      </button>
                    ))}
                  </div>
                </div>

                {currentAlert.selectedLanguage === 'en' && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ENGLISH MESSAGE:</span>
                    <textarea
                      rows={3}
                      value={currentAlert.messageEn}
                      onChange={(e) => updateAlertContent(currentAlert.id, { messageEn: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                )}

                {currentAlert.selectedLanguage === 'hi' && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">HINDI MESSAGE (हिंदी):</span>
                    <textarea
                      rows={3}
                      value={currentAlert.messageHi}
                      onChange={(e) => updateAlertContent(currentAlert.id, { messageHi: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                )}

                {currentAlert.selectedLanguage === 'local' && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">LOCAL LANGUAGE MESSAGE (অসমীয়া):</span>
                    <textarea
                      rows={3}
                      value={currentAlert.messageLocal}
                      onChange={(e) => updateAlertContent(currentAlert.id, { messageLocal: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons: Preview & Publish */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Eye className="h-4 w-4" /> PREVIEW ALERT
                </button>

                {!['SENT', 'PARTIAL', 'ACTIVE', 'SENDING'].includes(currentAlert.status) ? (
                  <>
                    <button
                      onClick={() => handlePublish(currentAlert.id, true)}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg text-xs font-extrabold transition flex items-center gap-2 shadow-md cursor-pointer"
                    >
                      <Send className="h-4 w-4" /> SEND TEST
                    </button>
                    <button
                      onClick={() => setIsPublishModalOpen(true)}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-extrabold transition flex items-center gap-2 shadow-md cursor-pointer"
                    >
                      <Send className="h-4 w-4" /> PUBLISH ALERT TO COMMUNITY
                    </button>
                  </>
                ) : (
                  <span className="px-4 py-2 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Alert Active & Published
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE PREVIEW MODAL */}
      {showPreviewModal && currentAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 w-[340px] rounded-[3rem] p-3 shadow-2xl shadow-black/50 border-[6px] border-slate-800 relative animate-in zoom-in-95 duration-300 flex flex-col">
            
            {/* Fake iPhone Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />

            {/* Phone Screen Area */}
            <div className="bg-slate-950 rounded-[2.25rem] overflow-hidden relative flex flex-col h-full border border-slate-800/50">
              
              {/* Status Bar Fake */}
              <div className="h-10 w-full flex items-end justify-between px-6 pb-2 opacity-50 relative z-10">
                <span className="text-[10px] font-bold text-white tracking-widest">9:41</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2.5 bg-white rounded-sm" />
                  <div className="w-3 h-3 rounded-full bg-white" />
                </div>
              </div>

              <div className="p-5 flex-1 relative z-10">
                <div className="text-center mb-6">
                  <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">Citizen Alert Preview</span>
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-red-600 p-5 rounded-[1.5rem] text-white shadow-xl shadow-red-500/20 relative overflow-hidden group">
                  {/* Subtle inner glow/gradient */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md text-white rounded-lg font-black text-[10px] tracking-wider uppercase border border-white/20 shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-200 animate-pulse" />
                      {currentAlert.severity} ALERT
                    </span>
                    <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-1">
                      GeoVision Verified
                    </span>
                  </div>
                  
                  <h4 className="font-black text-lg leading-tight mb-2 relative z-10">{currentAlert.title}</h4>
                  
                  <p className="text-sm text-red-50 font-medium leading-relaxed mb-4 relative z-10">
                    "{currentAlert.messageEn}"
                  </p>
                  
                  <div className="text-[10px] text-red-200 pt-3 border-t border-red-400/30 font-medium leading-loose relative z-10">
                    <strong className="text-white">Area:</strong> {currentAlert.affectedArea}<br/>
                    <strong className="text-white">Expires:</strong> {currentAlert.expiresAt}
                  </div>
                </div>
              </div>

              {/* Bottom Home Indicator */}
              <div className="h-6 w-full flex items-center justify-center pb-2 relative z-10">
                <div className="w-1/3 h-1 bg-white/20 rounded-full" />
              </div>
            </div>

            {/* External Close Button */}
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-2xl text-sm font-bold transition-all hover:scale-105"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* PUBLISH ALERT & EMAIL DISPATCH MODAL (THIRD IMAGE) */}
      <PublishAlertModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        initialArea={currentAlert?.affectedArea || 'Kamrup'}
        initialTitle={currentAlert?.title?.replace('undefined', 'Flood & Landslide') || 'Immediate Riverine Flood Surge & Inundation Warning'}
        initialSeverity={(currentAlert?.severity as any) || 'CRITICAL'}
        initialInstructions={currentAlert?.messageEn || 'River gauge level at 2.45m exceeding flood crest. Severe waterlogging along lowland corridor. Evacuate immediately to highland relief facilities.'}
        onAlertPublished={() => {
          setPublishedToast(true);
          setTimeout(() => setPublishedToast(false), 5000);
        }}
      />
    </div>
  );
};
