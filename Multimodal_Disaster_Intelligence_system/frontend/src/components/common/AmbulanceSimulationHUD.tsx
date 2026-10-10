import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Compass,
  MapPin,
  Clock,
  Gauge,
  X,
  Minimize2,
  Maximize2,
  ShieldAlert,
  Radio,
  CheckCircle2,
} from 'lucide-react';

export interface SimulationState {
  resourceId: string;
  name: string;
  type: string;
  originName: string;
  destinationName: string;
  waypoints: [number, number][]; // [lat, lng]
  currentIndex: number;
  isPlaying: boolean;
  speedMultiplier: number;
  speedKmh: number;
  totalDistanceKm: number;
  remainingDistanceKm: number;
  etaSeconds: number;
  turnInstructions: string[];
  followCamera: boolean;
  hospitalBedInfo?: string;
}

interface AmbulanceSimulationHUDProps {
  sim: SimulationState | null;
  onPlayPause: () => void;
  onSpeedChange: (multiplier: number) => void;
  onReset: () => void;
  onClose: () => void;
  onToggleFollowCamera: () => void;
}

export const AmbulanceSimulationHUD: React.FC<AmbulanceSimulationHUDProps> = ({
  sim,
  onPlayPause,
  onSpeedChange,
  onReset,
  onClose,
  onToggleFollowCamera,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!sim) return null;

  const totalPoints = Math.max(1, sim.waypoints.length);
  const progressPct = Math.min(100, Math.round((sim.currentIndex / totalPoints) * 100));

  const formatEta = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const currentTurn =
    sim.turnInstructions && sim.turnInstructions.length > 0
      ? sim.turnInstructions[
          Math.min(
            sim.turnInstructions.length - 1,
            Math.floor((sim.currentIndex / totalPoints) * sim.turnInstructions.length)
          )
        ]
      : 'Navigating optimal high-elevation arterial corridor';

  // If minimized: show ultra-compact bottom HUD pill
  if (isMinimized) {
    return (
      <div className="absolute bottom-4 right-4 z-[2000] font-sans animate-in slide-in-from-bottom duration-200">
        <div className="bg-slate-950/95 text-white border border-white/20 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>

          <div className="flex items-center gap-2">
            <span className="text-sm">🚑</span>
            <span className="font-extrabold text-xs text-white truncate max-w-[150px]">{sim.name}</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-amber-400 font-bold">{sim.isPlaying ? Math.round(sim.speedKmh * sim.speedMultiplier) : 0} km/h</span>
            <span className="text-slate-500">|</span>
            <span className="text-sky-400 font-bold">{formatEta(sim.etaSeconds)}</span>
            <span className="text-slate-500">|</span>
            <span className="text-rose-400 font-bold">{progressPct}%</span>
          </div>

          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={onPlayPause}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs"
              title={sim.isPlaying ? 'Pause' : 'Resume'}
            >
              {sim.isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
            </button>

            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition text-xs flex items-center gap-1 font-bold px-2.5"
              title="Expand Aside Panel"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Aside View
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition"
              title="Exit Simulation"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Aside Panel View (Docked cleanly on the right side)
  return (
    <aside
      aria-label="Simulation Aside"
      className="absolute top-3 right-3 bottom-3 z-[2000] w-[380px] max-w-[calc(100%-1.5rem)] font-sans animate-in slide-in-from-right duration-300 pointer-events-auto flex flex-col"
    >
      <div className="bg-slate-950/95 text-white rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl flex flex-col h-full overflow-hidden">
        
        {/* Top Header with Siren, Code 3 badge, Minimize & Close */}
        <div className="p-3.5 border-b border-white/10 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-rose-400 uppercase tracking-wider">
                  Live Travel Simulation
                </span>
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                  CODE 3
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Real-Time ORS Highway Dispatch</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition"
              title="Minimize to Compact Bar"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition"
              title="Exit Simulation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Aside Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scroll">
          
          {/* Active Unit Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <h4 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                <span className="text-base">🚑</span> {sim.name}
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                Segment {sim.currentIndex + 1} / {totalPoints}
              </span>
            </div>

            <div className="text-[11px] text-slate-300 space-y-1 mt-1 bg-black/30 p-2.5 rounded-lg border border-white/5">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-sky-400 shrink-0" />
                <span className="text-slate-400 text-[10px] uppercase font-bold">Base:</span>
                <span className="text-slate-200 font-medium truncate">{sim.originName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Navigation className="h-3 w-3 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 text-[10px] uppercase font-bold">Target:</span>
                <span className="text-emerald-300 font-bold truncate">{sim.destinationName}</span>
              </div>
            </div>
          </div>

          {/* Live Gauges (3-column layout) */}
          <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-xl border border-white/10 text-center">
            <div>
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-semibold">
                <Gauge className="h-3 w-3 text-amber-400" /> Live Speed
              </span>
              <div className="text-base font-black text-amber-400 mt-0.5">
                {sim.isPlaying ? Math.round(sim.speedKmh * sim.speedMultiplier) : 0}{' '}
                <span className="text-[10px] font-normal text-slate-400">km/h</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-semibold">
                <Clock className="h-3 w-3 text-sky-400" /> ETA
              </span>
              <div className="text-base font-black text-sky-400 mt-0.5 font-mono">
                {formatEta(sim.etaSeconds)}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-semibold">
                <Navigation className="h-3 w-3 text-emerald-400" /> Left
              </span>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                {sim.remainingDistanceKm.toFixed(1)}{' '}
                <span className="text-[10px] font-normal text-slate-400">km</span>
              </div>
            </div>
          </div>

          {/* Route Transit Progress */}
          <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex justify-between text-[11px] text-slate-300 font-semibold">
              <span>Route Transit Progress</span>
              <span className="text-rose-400 font-bold">{progressPct}% Complete</span>
            </div>
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Active Turn-by-Turn ORS Highway Artery */}
          <div className="bg-sky-950/40 border border-sky-500/30 rounded-xl p-3 space-y-1 text-xs text-sky-200">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
              <Compass className="h-3.5 w-3.5 text-sky-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Current Navigation Leg</span>
            </div>
            <p className="font-semibold text-white leading-snug">
              {currentTurn}
            </p>
          </div>

          {/* Field Logistics & Emergency Protocol */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> Emergency Protocol
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Radio className="h-3 w-3 animate-pulse" /> Channel 1 Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-slate-400 block font-medium">Hospital ER Status:</span>
                <span className="text-emerald-300 font-bold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Ready for Reception
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Hazard Bypass:</span>
                <span className="text-sky-300 font-bold mt-0.5 block">Active Artery</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Simulation Control Bar */}
        <div className="p-3 border-t border-white/10 bg-black/40 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onPlayPause}
                className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                  sim.isPlaying
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                }`}
              >
                {sim.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {sim.isPlaying ? 'Pause' : 'Resume'}
              </button>

              <button
                onClick={onReset}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition"
                title="Reset to Departure Point"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Speed Multiplier Pill */}
            <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10 text-[10px] font-bold">
              {[1, 2, 4].map((mult) => (
                <button
                  key={mult}
                  onClick={() => onSpeedChange(mult)}
                  className={`px-2 py-1 rounded-lg transition ${
                    sim.speedMultiplier === mult
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mult}x
                </button>
              ))}
            </div>

            {/* Follow Camera Toggle */}
            <button
              onClick={onToggleFollowCamera}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 border transition ${
                sim.followCamera
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
              title="Auto-center camera on moving vehicle"
            >
              <Navigation className="h-3 w-3" /> Follow
            </button>
          </div>
        </div>

      </div>
    </aside>
  );
};
