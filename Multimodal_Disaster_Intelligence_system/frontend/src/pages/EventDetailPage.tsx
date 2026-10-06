import React from 'react';
import {
  Clock,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RiskBadge } from '../components/common/RiskBadge';
import { InteractiveMap } from '../components/common/InteractiveMap';

export const EventDetailPage: React.FC = () => {
  const { selectedEvent, events, setActiveTab } = useApp();

  const currentEvent = selectedEvent || events[0];

  if (!currentEvent) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500 animate-pulse">Loading Event Detail...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('active-events')}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-400">{currentEvent.id}</span>
              <RiskBadge level={currentEvent.combinedPriority} size="sm" pulse={currentEvent.combinedPriority === 'CRITICAL'} />
              <RiskBadge level={currentEvent.status} size="sm" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {currentEvent.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentEvent.status === 'PENDING_REVIEW' && (
            <button
              onClick={() => setActiveTab('expert-review')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <ShieldCheck className="h-4 w-4" /> Review Event Now
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Summary Cards & Map */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Hazard Metrics Overview
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
              <div className="p-3 bg-sky-50 rounded-lg border border-sky-100">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Flood Risk</span>
                <span className="text-xl font-black text-sky-700">{currentEvent.floodRisk !== undefined ? `${currentEvent.floodRisk}%` : 'Coming Soon'}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Landslide Risk</span>
                <span className="text-xl font-black text-amber-700">{currentEvent.landslideRisk}%</span>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Confidence</span>
                <span className="text-xl font-black text-purple-700">{currentEvent.confidence !== undefined ? `${currentEvent.confidence}%` : 'Unavailable'}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Exposed Pop</span>
                <span className="text-xl font-black text-rose-700">{currentEvent.impact?.exposedPopulation !== undefined ? currentEvent.impact.exposedPopulation.toLocaleString() : 'Unavailable'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 font-medium">
              "{currentEvent.aiExplanation}"
            </p>

            {/* FLOOD TELEMETRY PANEL */}
            <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 space-y-3">
              <h3 className="font-extrabold text-[11px] text-sky-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-sky-100 pb-1.5">
                2026 Flood Telemetry
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-sky-600 font-bold uppercase block">S1 VV</span>
                  <span className="font-bold text-slate-800">
                    {currentEvent.floodSentinel1VV !== undefined && currentEvent.floodSentinel1VV !== null 
                      ? `${currentEvent.floodSentinel1VV} dB` : 'Unavailable'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-600 font-bold uppercase block">S1 VH</span>
                  <span className="font-bold text-slate-800">
                    {currentEvent.floodSentinel1VH !== undefined && currentEvent.floodSentinel1VH !== null 
                      ? `${currentEvent.floodSentinel1VH} dB` : 'Unavailable'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-600 font-bold uppercase block">VV Change</span>
                  <span className="font-bold text-slate-800">
                    {currentEvent.floodSentinel1VVChange !== undefined && currentEvent.floodSentinel1VVChange !== null 
                      ? `${currentEvent.floodSentinel1VVChange} dB` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-600 font-bold uppercase block">2026 Rainfall</span>
                  <span className="font-bold text-red-500">Unavailable</span>
                </div>
              </div>
            </div>
          </div>

          <InteractiveMap
            events={[currentEvent]}
            selectedEventId={currentEvent.id}
            heightClass="h-[380px]"
            showLayerControls={false}
          />
        </div>

        {/* Right Side: VERTICAL EVENT TIMELINE */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="h-4 w-4 text-sky-600" /> Event Lifecycle Vertical Timeline
            </h3>

            {/* Vertical Timeline List */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {currentEvent.timeline.map((item, index) => (
                <div key={index} className="relative group">
                  {/* Circle Node Indicator */}
                  <span className={`absolute -left-6 top-0.5 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${item.actor === 'AI' ? 'bg-purple-600' :
                      item.actor === 'EXPERT' ? 'bg-emerald-600' :
                        item.actor === 'CITIZEN' ? 'bg-rose-600' : 'bg-slate-700'
                    }`}>
                    {index + 1}
                  </span>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-slate-500">{item.time}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.actor === 'AI' ? 'bg-purple-100 text-purple-800' :
                          item.actor === 'EXPERT' ? 'bg-emerald-100 text-emerald-800' :
                            item.actor === 'CITIZEN' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800'
                        }`}>
                        {item.actor}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900">{item.label}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
