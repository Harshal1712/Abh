import React, { useState } from 'react';
import { 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Brain, 
  Sparkles, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  ShieldCheck, 
  CheckCheck 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/common/RiskBadge';
import type { CommunityReport } from '../types';

export const CommunityReportsPage: React.FC = () => {
  const { communityReports, verifyReport, rejectReport } = useApp();
  
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'AI_ACCEPT' | 'AI_REJECT' | 'UNVERIFIED' | 'VERIFIED'>('ALL');
  const [selectedReportDetail, setSelectedReportDetail] = useState<CommunityReport | null>(null);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  // Filtered reports
  const filteredReports = communityReports.filter(rep => {
    if (activeFilter === 'AI_ACCEPT') {
      return rep.aiAnalysis?.recommendation === 'ACCEPT';
    }
    if (activeFilter === 'AI_REJECT') {
      return rep.aiAnalysis?.recommendation === 'REJECT';
    }
    if (activeFilter === 'UNVERIFIED') {
      return rep.status === 'UNVERIFIED';
    }
    if (activeFilter === 'VERIFIED') {
      return rep.status === 'VERIFIED';
    }
    return true;
  });

  // Aggregate stats
  const aiAcceptCount = communityReports.filter(r => r.aiAnalysis?.recommendation === 'ACCEPT').length;
  const aiRejectCount = communityReports.filter(r => r.aiAnalysis?.recommendation === 'REJECT').length;
  const unverifiedCount = communityReports.filter(r => r.status === 'UNVERIFIED').length;
  const verifiedCount = communityReports.filter(r => r.status === 'VERIFIED').length;

  const handleBatchAcceptAi = () => {
    const eligible = communityReports.filter(r => r.status === 'UNVERIFIED' && r.aiAnalysis?.recommendation === 'ACCEPT');
    if (eligible.length === 0) {
      alert("No pending reports with AI 'ACCEPT' recommendation found.");
      return;
    }
    if (confirm(`Approve and dispatch alerts for all ${eligible.length} AI-recommended genuine hazard observations?`)) {
      eligible.forEach(r => verifyReport(r.id));
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-indigo-600" /> Citizen Ground Truth & AI Verification
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time crowdsourced hazard observations evaluated by client-side neural vision and NLP algorithms.
          </p>
        </div>

        {unverifiedCount > 0 && aiAcceptCount > 0 && (
          <button
            onClick={handleBatchAcceptAi}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition"
          >
            <CheckCheck className="h-4 w-4" /> Auto-Accept AI Genuine Hazards ({communityReports.filter(r => r.status === 'UNVERIFIED' && r.aiAnalysis?.recommendation === 'ACCEPT').length})
          </button>
        )}
      </div>

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Ground Feeds</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{communityReports.length}</span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">{unverifiedCount} pending evaluation</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs bg-gradient-to-br from-white to-emerald-50/30">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-600" /> AI Recommended: ACCEPT
          </span>
          <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">{aiAcceptCount}</span>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">High confidence hazard telemetry</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs bg-gradient-to-br from-white to-rose-50/30">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-rose-600" /> AI Recommended: REJECT
          </span>
          <span className="text-2xl font-extrabold text-rose-700 mt-1 block">{aiRejectCount}</span>
          <span className="text-[11px] text-rose-600 mt-0.5 block">Low relevance or spam detected</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-2xs bg-gradient-to-br from-white to-indigo-50/30">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-indigo-600" /> Verified & Escalated
          </span>
          <span className="text-2xl font-extrabold text-indigo-700 mt-1 block">{verifiedCount}</span>
          <span className="text-[11px] text-indigo-600 mt-0.5 block">Published to community alerts</span>
        </div>
      </div>

      {/* POLICY BANNER */}
      <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 flex items-start gap-3 text-xs text-indigo-950">
        <Brain className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-indigo-950 uppercase tracking-wide">
            Automated Client-Side AI Suggestion Policy:
          </h4>
          <p className="mt-0.5 text-indigo-900 leading-relaxed">
            Every citizen report undergoes client-side pixel density inspection (turbid sediment and floodwater chromatic profiles) and emergency NLP parsing. AI provides an immediate suggestion (<strong>ACCEPT</strong> or <strong>REJECT</strong>) to guide the Duty Officer. Accepting an event publishes it to the citizen alert feed and triggers targeted email notifications.
          </p>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Reports ({communityReports.length})
        </button>

        <button
          onClick={() => setActiveFilter('AI_ACCEPT')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeFilter === 'AI_ACCEPT'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <Sparkles className="h-3 w-3" /> AI Suggestion: ACCEPT ({aiAcceptCount})
        </button>

        <button
          onClick={() => setActiveFilter('AI_REJECT')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeFilter === 'AI_REJECT'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <AlertTriangle className="h-3 w-3" /> AI Suggestion: REJECT ({aiRejectCount})
        </button>

        <button
          onClick={() => setActiveFilter('UNVERIFIED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeFilter === 'UNVERIFIED'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          Pending Review ({unverifiedCount})
        </button>

        <button
          onClick={() => setActiveFilter('VERIFIED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeFilter === 'VERIFIED'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
          }`}
        >
          Verified ({verifiedCount})
        </button>
      </div>

      {/* REPORTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Report ID</th>
                <th className="py-3.5 px-4">Hazard & Location</th>
                <th className="py-3.5 px-4">Ground Evidence</th>
                <th className="py-3.5 px-4">🤖 AI Suggestion & Analysis</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Duty Officer Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
              {filteredReports.map(rep => {
                const ai = rep.aiAnalysis;
                const isAccept = ai?.recommendation === 'ACCEPT';

                return (
                  <tr key={rep.id} className="hover:bg-slate-50/80 transition">
                    {/* Report ID & Timestamp */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-900">{rep.id}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{rep.timestamp}</div>
                    </td>

                    {/* Hazard & Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-black text-[10px] text-slate-800 border border-slate-200">
                          {rep.type.replace('_', ' ')}
                        </span>
                        <RiskBadge level={rep.severity} size="sm" />
                      </div>
                      <div className="font-bold text-slate-900">{rep.location}</div>
                      <div className="text-[10px] text-slate-500">{rep.district} District</div>
                      {rep.exifLocation && (
                        <div className="text-[9px] mt-1 font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-block border border-emerald-200">
                          GPS: {rep.exifLocation.lat.toFixed(4)}, {rep.exifLocation.lng.toFixed(4)}
                        </div>
                      )}
                    </td>

                    {/* Ground Evidence (Description + Photo) */}
                    <td className="py-3.5 px-4 max-w-[260px]">
                      <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed">{rep.description}</p>
                      {rep.photoUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img 
                            src={rep.photoUrl} 
                            alt="Evidence" 
                            onClick={() => setSelectedImageModal(rep.photoUrl || null)}
                            className="h-10 w-10 object-cover rounded-lg border border-slate-300 cursor-pointer hover:opacity-80 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedImageModal(rep.photoUrl || null)}
                            className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> Zoom Photo
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 🤖 AI SUGGESTION & DETECTED TELEMETRY */}
                    <td className="py-3.5 px-4 min-w-[260px] max-w-[320px]">
                      {ai ? (
                        <div className="space-y-1.5">
                          {/* AI Recommendation Badge */}
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black border ${
                              isAccept
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}>
                              {isAccept ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                              AI Suggestion: {isAccept ? 'ACCEPT EVENT' : 'REJECT EVENT'} ({ai.confidence}%)
                            </span>
                          </div>

                          {/* Reasoning Snippet */}
                          <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                            {ai.reasoning}
                          </p>

                          {/* Detected Features Chips */}
                          {ai.detectedFeatures.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ai.detectedFeatures.slice(0, 2).map((feat, idx) => (
                                <span key={idx} className="text-[9px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                  ✓ {feat}
                                </span>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedReportDetail(rep)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1"
                          >
                            Full AI Diagnostics <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No AI telemetry computed</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        rep.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rep.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rep.status}
                      </span>
                    </td>

                    {/* Duty Officer Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {rep.status === 'UNVERIFIED' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => verifyReport(rep.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition flex items-center gap-1 shadow-2xs"
                            title="Accept report and promote to verified emergency alert"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Accept
                          </button>
                          <button
                            onClick={() => rejectReport(rep.id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-lg font-bold text-xs transition flex items-center gap-1 border border-slate-200"
                            title="Reject report as unverified or spam"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono italic">
                          Actioned by {rep.reviewedBy || 'Duty Officer'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No community reports found matching current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL AI DIAGNOSTICS MODAL */}
      {selectedReportDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-800">
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                  ResQGrid Neural Intelligence Report
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Report #{selectedReportDetail.id} Diagnostics
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Citizen Description:</span>
                <p className="text-slate-800 text-xs italic">"{selectedReportDetail.description}"</p>
              </div>

              {selectedReportDetail.aiAnalysis && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50">
                    <span className="font-bold text-slate-700">AI Confidence Score:</span>
                    <span className="font-black text-sm text-indigo-700">
                      {selectedReportDetail.aiAnalysis.confidence}% Match
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    selectedReportDetail.aiAnalysis.recommendation === 'ACCEPT'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    <span className="font-black block uppercase text-[10px] mb-1">
                      Duty Officer Suggestion:
                    </span>
                    <p className="font-bold text-sm">
                      {selectedReportDetail.aiAnalysis.recommendation === 'ACCEPT' ? '✅ RECOMMENDATION: ACCEPT EVENT' : '❌ RECOMMENDATION: REJECT EVENT'}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Analytical Reasoning:</span>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                      {selectedReportDetail.aiAnalysis.reasoning}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1.5">Detected Telemetry Features:</span>
                    <div className="space-y-1">
                      {selectedReportDetail.aiAnalysis.detectedFeatures.map((f, i) => (
                        <div key={i} className="text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end gap-2">
              {selectedReportDetail.status === 'UNVERIFIED' && (
                <>
                  <button
                    onClick={() => {
                      verifyReport(selectedReportDetail.id);
                      setSelectedReportDetail(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                  >
                    Accept & Dispatch Alert
                  </button>
                  <button
                    onClick={() => {
                      rejectReport(selectedReportDetail.id);
                      setSelectedReportDetail(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedReportDetail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE ZOOM MODAL */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setSelectedImageModal(null)}>
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            <img src={selectedImageModal} alt="Zoomed Evidence" className="max-w-full max-h-[85vh] object-contain" />
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white rounded-full p-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
