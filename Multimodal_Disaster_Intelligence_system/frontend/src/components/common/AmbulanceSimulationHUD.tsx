import React from 'react';
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
      : 'Navigating optimal highland road artery';

  return (
    <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:w-[480px] z-[2000] font-sans animate-in slide-in-from-right duration-300">
      <div className="bg-slate-950/90 text-white rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl overflow-hidden p-4 space-y-3">
        {/* Top Header with Siren & Close */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs text-rose-400 uppercase tracking-wider">
                🚨 Live Real-Time Travel Simulation
              </span>
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                CODE 3
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition"
            title="Exit Simulation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Vehicle Identity & Route */}
        <div>
          <div className="flex items-baseline justify-between">
            <h4 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
              <span className="text-base">🚑</span> {sim.name}
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Waypoint {sim.currentIndex + 1} / {totalPoints}
            </span>
          </div>

          <div className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-1">
            <MapPin className="h-3 w-3 text-sky-400 shrink-0" />
            <span className="text-slate-400">{sim.originName}</span>
            <span className="text-slate-500">➔</span>
            <span className="text-emerald-400 font-bold">{sim.destinationName}</span>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-3 gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10 text-center">
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
              <Clock className="h-3 w-3 text-sky-400" /> ETA Countdown
            </span>
            <div className="text-base font-black text-sky-400 mt-0.5 font-mono">
              {formatEta(sim.etaSeconds)}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-semibold">
              <Navigation className="h-3 w-3 text-emerald-400" /> Distance Left
            </span>
            <div className="text-base font-black text-emerald-400 mt-0.5">
              {sim.remainingDistanceKm.toFixed(1)}{' '}
              <span className="text-[10px] font-normal text-slate-400">km</span>
            </div>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>Route Transit Progress</span>
            <span className="text-rose-400 font-bold">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Active Turn-by-Turn Instruction */}
        <div className="bg-sky-950/40 border border-sky-500/30 rounded-xl p-2 flex items-center gap-2 text-[11px] text-sky-200">
          <Compass className="h-4 w-4 text-sky-400 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
          <div className="truncate">
            <strong className="text-sky-300">ORS Road Segment:</strong> {currentTurn}
          </div>
        </div>

        {/* Interactive Simulation Controls */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPlayPause}
              className={`p-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
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
  );
};
