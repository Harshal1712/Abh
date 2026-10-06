import React from 'react';
import { 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/common/RiskBadge';

export const CommunityReportsPage: React.FC = () => {
  const { communityReports, verifyReport, rejectReport } = useApp();

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-rose-600" /> Citizen & Ground Feedback Verification
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time crowdsourced observation feed for ground truth cross-validation.
          </p>
        </div>
      </div>

      {/* MANDATED SAFETY DESIGN BANNER */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-950 uppercase tracking-wide">Ground Feedback Policy:</h4>
          <p className="mt-0.5">
            "Community reports are treated as unverified observations until reviewed or cross-validated." Verified observations update ground truth indicators but do not directly trigger public alerts without analyst approval.
          </p>
        </div>
      </div>

      {/* REPORTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
            Incoming Ground Observations ({communityReports.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Report ID</th>
                <th className="py-3.5 px-4">Hazard Type</th>
                <th className="py-3.5 px-4">Location / Sector</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Verification Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
              {communityReports.map(rep => (
                <tr key={rep.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{rep.id}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[11px]">
                      {rep.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{rep.location}</div>
                    <div className="text-[10px] text-slate-500">{rep.district} District</div>
                    {rep.exifLocation && (
                      <div className="text-[9px] mt-1 font-mono text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded inline-block">
                        GPS: {rep.exifLocation.lat.toFixed(4)}, {rep.exifLocation.lng.toFixed(4)}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <RiskBadge level={rep.severity} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{rep.timestamp}</td>
                  <td className="py-3.5 px-4 max-w-[280px]">
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{rep.description}</p>
                    {rep.photoUrl && (
                      <a href={rep.photoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-sky-600 font-bold mt-1 inline-block hover:underline">View Photo</a>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <RiskBadge 
                      level={rep.status === 'VERIFIED' ? 'VERIFIED' : rep.status === 'REJECTED' ? 'REJECTED' : 'UNVERIFIED'} 
                      size="sm" 
                    />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {rep.status === 'UNVERIFIED' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => verifyReport(rep.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" /> Verify
                        </button>
                        <button
                          onClick={() => rejectReport(rep.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono italic">
                        By {rep.reviewedBy || 'Expert'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
