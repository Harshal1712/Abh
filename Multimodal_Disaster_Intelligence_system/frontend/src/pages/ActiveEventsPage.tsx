import React, { useState } from 'react';
import { 
  Search, 
  Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/common/RiskBadge';
import type { RiskLevel, EventStatus } from '../types';

export const ActiveEventsPage: React.FC = () => {
  const { events, setSelectedEventId, setActiveTab } = useApp();

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'ALL'>('ALL');

  const filteredEvents = events.filter(evt => {
    const matchesSearch = evt.id.toLowerCase().includes(search.toLowerCase()) ||
                          evt.title.toLowerCase().includes(search.toLowerCase()) ||
                          evt.location.toLowerCase().includes(search.toLowerCase()) ||
                          evt.district.toLowerCase().includes(search.toLowerCase());
    
    const matchesRisk = riskFilter === 'ALL' || evt.combinedPriority === riskFilter;
    const matchesStatus = statusFilter === 'ALL' || evt.status === statusFilter;

    return matchesSearch && matchesRisk && matchesStatus;
  });

  const handleOpenEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setActiveTab('event-detail');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Active Multi-Hazard Events
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Central registry of all detected, reviewed, approved, and monitored hazard events.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by ID (e.g. RAI-2026-001), district, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Risk Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Risk Level:</span>
              {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    riskFilter === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 text-xs border-t border-slate-100 pt-3">
          <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider mr-2">Lifecycle Status:</span>
          {(['ALL', 'MONITORING', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE_ALERT', 'HOLD', 'REJECTED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                statusFilter === s ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Event ID</th>
                <th className="py-3.5 px-4">Location / District</th>
                <th className="py-3.5 px-4">Primary Hazard</th>
                <th className="py-3.5 px-4">Flood Risk</th>
                <th className="py-3.5 px-4">Landslide Risk</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Confidence</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-bold">No active risk events found</p>
                    <p className="text-xs mt-1">Events generated by AI risk calculations will appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map(evt => (
                  <tr 
                    key={evt.id} 
                    className={`hover:bg-slate-50 transition cursor-pointer`}
                    onClick={() => handleOpenEvent(evt.id)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{evt.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{evt.district}</div>
                      <div className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">{evt.location}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {evt.primaryHazard.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {evt.floodRisk !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-700">{evt.floodRisk}%</span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${evt.floodRisk}%` }} />
                          </div>
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-700">{evt.landslideRisk}%</span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5">
                          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${evt.landslideRisk || 0}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge level={evt.combinedPriority} size="sm" pulse={evt.combinedPriority === 'CRITICAL'} />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {evt.confidence !== undefined ? `${evt.confidence}%` : <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Unavailable</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge level={evt.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{evt.lastUpdated}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEvent(evt.id);
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
