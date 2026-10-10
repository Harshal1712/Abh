import React, { useState, useEffect } from 'react';
import { 
  Layers, CheckSquare, Square, Target, Waves, MapPin, 
  Truck, ShieldAlert, HeartPulse, 
  Route, CheckCircle2, RotateCcw, AlertTriangle, 
  Send, Compass, Phone, Sparkles
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { HazardEvent, EmergencyResource } from '../../types';

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper to create distinctive Leaflet DivIcons for each resource type
const createResourceIcon = (type: string, status: string = 'AVAILABLE') => {
  let emoji = '🚑';
  let bgClass = 'bg-rose-600';
  let pulse = '';

  if (status === 'DISPATCHED' || status === 'EN_ROUTE') {
    pulse = 'animate-bounce ring-4 ring-amber-400 ring-offset-2';
  }

  switch (type) {
    case 'AMBULANCE':
      emoji = '🚑';
      bgClass = status === 'AVAILABLE' ? 'bg-rose-600' : 'bg-amber-600';
      break;
    case 'RESCUE_TEAM':
      emoji = '🛡️';
      bgClass = status === 'AVAILABLE' ? 'bg-orange-600' : 'bg-amber-600';
      break;
    case 'HOSPITAL':
      emoji = '🏥';
      bgClass = 'bg-blue-600';
      break;
    case 'SHELTER':
      emoji = '⛺';
      bgClass = 'bg-emerald-600';
      break;
    case 'RESCUE_BOAT':
      emoji = '🚤';
      bgClass = 'bg-cyan-600';
      break;
    default:
      emoji = '📍';
      bgClass = 'bg-indigo-600';
  }

  return L.divIcon({
    className: 'custom-resource-marker',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background-color:${bgClass.includes('rose') ? '#e11d48' : bgClass.includes('orange') ? '#ea580c' : bgClass.includes('blue') ? '#2563eb' : bgClass.includes('emerald') ? '#059669' : bgClass.includes('cyan') ? '#0891b2' : '#f59e0b'};border:2px solid white;box-shadow:0 10px 15px -3px rgba(0,0,0,0.4);font-size:16px;" class="${pulse}">
        ${emoji}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
};

interface InteractiveMapProps {
  events: HazardEvent[];
  selectedEventId?: string;
  onSelectEvent?: (eventId: string) => void;
  heightClass?: string;
  showLayerControls?: boolean;
  activeLayersOverride?: Record<string, boolean>;
  onMapClick?: (lat: number, lng: number) => void;
  pointQueryData?: any; // To display clicked point risk
  onCreateEvent?: (data: any, pos: { lat: number; lng: number }) => void;
}

// Custom hook to handle map clicks
function MapEventsHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  heightClass = 'h-[520px]',
  showLayerControls = true,
  activeLayersOverride,
  onMapClick,
  pointQueryData,
  onCreateEvent,
}) => {
  const [layers, setLayers] = useState<Record<string, boolean>>({
    baselineSusceptibility: true,
    floodRisk: true,
    ambulances: true,
    rescueTeams: true,
    hospitals: true,
    shelters: true,
    evacuationRoutes: true,
    hazardRoads: true,
    responseRadius: true,
    ...activeLayersOverride,
  });

  const [clickedPos, setClickedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [resources, setResources] = useState<EmergencyResource[]>([]);
  const [resourceSummary, setResourceSummary] = useState<any>(null);
  const [evacRoutes, setEvacRoutes] = useState<any>(null);
  const [dispatchedRoutes, setDispatchedRoutes] = useState<any[]>([]);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployNotification, setDeployNotification] = useState<string | null>(null);
  const [sidePanelTab, setSidePanelTab] = useState<'risk' | 'logistics' | 'routes'>('risk');

  // Load initial fleet of resources across Assam sector
  const loadResources = async (lat?: number, lng?: number) => {
    try {
      const url = lat !== undefined && lng !== undefined
        ? `/api/resources?lat=${lat}&lng=${lng}`
        : '/api/resources';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
        if (data.summary) {
          setResourceSummary(data.summary);
        }
      }
    } catch (e) {
      console.error('Failed to load emergency resources:', e);
    }
  };

  // Load nearby evacuation routes for clicked location
  const loadEvacRoutes = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/resources/routes/nearby?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.routes) {
          setEvacRoutes(data.routes);
        }
      }
    } catch (e) {
      console.error('Failed to load evacuation routes:', e);
    }
  };

  useEffect(() => {
    // Initial fetch of emergency fleet
    loadResources();
  }, []);

  useEffect(() => {
    if (selectedEventId && events.length > 0) {
      const evt = events.find(e => e.id === selectedEventId);
      if (evt) {
        setClickedPos({ lat: evt.coordinates.lat, lng: evt.coordinates.lng });
        loadResources(evt.coordinates.lat, evt.coordinates.lng);
        loadEvacRoutes(evt.coordinates.lat, evt.coordinates.lng);
      }
    }
  }, [selectedEventId, events]);

  const handleMapClick = (lat: number, lng: number) => {
    setClickedPos({ lat, lng });
    loadResources(lat, lng);
    loadEvacRoutes(lat, lng);
    setSidePanelTab('risk');
    if (onMapClick) {
      onMapClick(lat, lng);
    }
  };

  // One-Click Deploy: Deploy all nearby emergency units to clicked area
  const handleDeployAllNearby = async () => {
    if (!clickedPos) return;
    setIsDeploying(true);
    try {
      const res = await fetch('/api/resources/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLat: clickedPos.lat,
          targetLng: clickedPos.lng,
          targetName: pointQueryData?.placeName || `Hazard Sector (${clickedPos.lat.toFixed(4)}, ${clickedPos.lng.toFixed(4)})`,
          deployAllNearby: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDeployNotification(data.message);
        if (data.routes) {
          setDispatchedRoutes(data.routes);
        }
        // Refresh fleet status
        loadResources(clickedPos.lat, clickedPos.lng);
        setTimeout(() => setDeployNotification(null), 6000);
      }
    } catch (e) {
      console.error('Failed to deploy units:', e);
    } finally {
      setIsDeploying(false);
    }
  };

  // Dispatch a specific resource unit
  const handleDispatchSingleUnit = async (resourceId: string) => {
    if (!clickedPos) return;
    setIsDeploying(true);
    try {
      const res = await fetch('/api/resources/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLat: clickedPos.lat,
          targetLng: clickedPos.lng,
          targetName: pointQueryData?.placeName || `Sector (${clickedPos.lat.toFixed(4)}, ${clickedPos.lng.toFixed(4)})`,
          resourceIds: [resourceId],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDeployNotification(data.message);
        if (data.routes) {
          setDispatchedRoutes(prev => [...prev, ...data.routes]);
        }
        loadResources(clickedPos.lat, clickedPos.lng);
        setTimeout(() => setDeployNotification(null), 5000);
      }
    } catch (e) {
      console.error('Failed to dispatch unit:', e);
    } finally {
      setIsDeploying(false);
    }
  };

  // Reset all deployed units back to AVAILABLE
  const handleResetFleet = async () => {
    try {
      const res = await fetch('/api/resources/reset', { method: 'POST' });
      if (res.ok) {
        setDispatchedRoutes([]);
        setDeployNotification('All emergency response units recalled to bases.');
        if (clickedPos) {
          loadResources(clickedPos.lat, clickedPos.lng);
        } else {
          loadResources();
        }
        setTimeout(() => setDeployNotification(null), 4000);
      }
    } catch (e) {
      console.error('Failed to recall units:', e);
    }
  };

  const toggleLayer = (key: string) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Center of Assam / Brahmaputra basin
  const center: [number, number] = [26.18, 91.80];

  return (
    <div className={`relative w-full ${heightClass} bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col`}>
      
      {/* Top Map Live Status Bar */}
      <div className="absolute top-3 left-3 z-[1000] flex max-w-[calc(100%-5.5rem)] items-center gap-2.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 text-slate-200 text-xs shadow-xl">
        <span className="flex items-center gap-1.5 font-bold text-sky-400">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          PRALAY SENSE · ASSAM EMERGENCY GIS
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-amber-400 font-semibold flex items-center gap-1 text-[11px]">
          <Truck className="h-3 w-3" /> Fleet Active: {resources.filter(r => r.status === 'AVAILABLE').length} Available
        </span>
        {dispatchedRoutes.length > 0 && (
          <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 text-[10px] animate-pulse">
            🚨 {dispatchedRoutes.length} EN ROUTE
          </span>
        )}
      </div>

      {/* Deployment Alert Toast */}
      {deployNotification && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1500] max-w-md w-full px-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="bg-slate-900/95 border-2 border-emerald-500 shadow-2xl backdrop-blur-xl p-3.5 rounded-2xl text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-extrabold text-emerald-400 text-xs">EMERGENCY DISPATCH INITIATED</p>
                <p className="text-[11px] text-slate-300 font-medium">{deployNotification}</p>
              </div>
            </div>
            <button 
              onClick={() => setDeployNotification(null)}
              className="text-slate-400 hover:text-white font-bold text-sm px-1.5"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* GIS & Logistics Layer Controls */}
      {showLayerControls && (
        <div className="absolute bottom-4 left-3 z-[1000] w-[230px] max-w-[calc(100%-1.5rem)] bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/60 shadow-2xl text-slate-200 text-xs">
          <div className="flex items-center justify-between font-extrabold text-slate-300 mb-2 border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Layers className="h-3.5 w-3.5" /> MAP LAYERS & LOGISTICS
            </span>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scroll">
            {[
              { id: 'ambulances', label: '🚑 Ambulances & Teams', color: 'text-rose-400' },
              { id: 'hospitals', label: '🏥 Hospitals & Shelters', color: 'text-blue-400' },
              { id: 'evacuationRoutes', label: '🛣️ Safe Evacuation Routes', color: 'text-emerald-400' },
              { id: 'hazardRoads', label: '⛔ Hazard / Blocked Roads', color: 'text-amber-400' },
              { id: 'responseRadius', label: '🎯 5km Response Radius', color: 'text-indigo-400' },
              { id: 'baselineSusceptibility', label: '🛰️ Hazard Susceptibility', color: 'text-slate-300' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => toggleLayer(item.id)}
                className="w-full flex items-center justify-between py-1 px-1.5 hover:bg-slate-800/80 rounded-lg transition text-[11px]"
              >
                <span className={`truncate font-semibold ${item.color}`}>{item.label}</span>
                {layers[item.id] ? (
                  <CheckSquare className="h-3.5 w-3.5 text-sky-400 shrink-0 ml-2" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-slate-600 shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
            <span className="text-slate-400">Assam Sector</span>
            <button 
              onClick={handleResetFleet}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="h-2.5 w-2.5" /> Recall Fleet
            </button>
          </div>
        </div>
      )}

      {/* Main Leaflet Map */}
      <MapContainer 
        center={center} 
        zoom={9} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <MapEventsHandler onClick={handleMapClick} />
        
        {/* OpenStreetMap Base Layer */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Baseline Susceptibility Raster Tile Layer (FastAPI ML Service) */}
        {layers.baselineSusceptibility && (
          <TileLayer
            url="http://127.0.0.1:8000/tiles/baseline/{z}/{x}/{y}.png"
            opacity={0.6}
            zIndex={10}
          />
        )}

        {/* Rapid Response Zones around clicked coordinate */}
        {clickedPos && layers.responseRadius && (
          <>
            {/* 5km Rapid Intervention Zone */}
            <Circle
              center={[clickedPos.lat, clickedPos.lng]}
              radius={5000}
              pathOptions={{
                color: '#6366f1',
                fillColor: '#818cf8',
                fillOpacity: 0.12,
                weight: 1.5,
              }}
            />
            {/* 15km Regional Evacuation Perimeter */}
            <Circle
              center={[clickedPos.lat, clickedPos.lng]}
              radius={15000}
              pathOptions={{
                color: '#f59e0b',
                fillColor: '#fbbf24',
                fillOpacity: 0.05,
                weight: 1,
                dashArray: '4, 8',
              }}
            />
          </>
        )}

        {/* Emergency Routes: Primary Safe Evacuation Corridor */}
        {evacRoutes?.primarySafe && layers.evacuationRoutes && (
          <Polyline 
            positions={evacRoutes.primarySafe.coordinates} 
            pathOptions={{ 
              color: '#10b981', 
              weight: 5, 
              opacity: 0.85,
            }} 
          />
        )}

        {/* Emergency Routes: Hospital Transit Route */}
        {evacRoutes?.hospitalRoute && layers.evacuationRoutes && (
          <Polyline 
            positions={evacRoutes.hospitalRoute.coordinates} 
            pathOptions={{ 
              color: '#3b82f6', 
              weight: 4, 
              opacity: 0.8,
              dashArray: '5, 8' 
            }} 
          />
        )}

        {/* Compromised / Flood-Inundated Hazard Road Corridor */}
        {evacRoutes?.compromisedHazardRoad && layers.hazardRoads && (
          <Polyline 
            positions={evacRoutes.compromisedHazardRoad.coordinates} 
            pathOptions={{ 
              color: '#ef4444', 
              weight: 4, 
              opacity: 0.85, 
              dashArray: '6, 10' 
            }} 
          />
        )}

        {/* Dispatched Unit Transit Corridors (Gold Glowing Line) */}
        {dispatchedRoutes.map((rt, idx) => (
          <Polyline 
            key={`dispatch-route-${idx}`}
            positions={rt.coordinates} 
            pathOptions={{ 
              color: '#f59e0b', 
              weight: 5, 
              opacity: 0.9,
              dashArray: '4, 8'
            }} 
          />
        ))}

        {/* Emergency Resource Fleet Markers (Ambulances, Rescue Teams, Hospitals, Shelters, Boats) */}
        {resources.map((r) => {
          const isAmbulanceOrTeam = r.type === 'AMBULANCE' || r.type === 'RESCUE_TEAM' || r.type === 'RESCUE_BOAT';
          const isFacility = r.type === 'HOSPITAL' || r.type === 'SHELTER';

          if (isAmbulanceOrTeam && !layers.ambulances) return null;
          if (isFacility && !layers.hospitals) return null;

          return (
            <Marker
              key={r.resourceId}
              position={[r.location.coordinates.lat, r.location.coordinates.lng]}
              icon={createResourceIcon(r.type, r.status)}
            >
              <Popup autoPan maxWidth={300} className="resource-popup">
                <div className="p-1 font-sans text-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <span className="font-extrabold text-[13px] text-slate-900 leading-tight">
                      {r.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      r.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <p className="text-slate-600 flex items-center gap-1 text-[11px]">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" /> {r.location.name}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/80 text-[10px]">
                    <div>
                      <span className="text-slate-400 block font-medium">Contact Hotline</span>
                      <span className="font-bold text-slate-700">{r.contact}</span>
                    </div>
                    {r.distanceKm !== undefined && (
                      <div>
                        <span className="text-slate-400 block font-medium">Distance & ETA</span>
                        <span className="font-bold text-indigo-600">
                          {r.distanceKm} km · {r.etaMinutes || Math.round(r.distanceKm * 1.5)} min
                        </span>
                      </div>
                    )}
                    {r.capacity ? (
                      <div>
                        <span className="text-slate-400 block font-medium">Capacity</span>
                        <span className="font-bold text-slate-700">{r.currentOccupancy || 0} / {r.capacity}</span>
                      </div>
                    ) : null}
                  </div>

                  {r.equipment && r.equipment.length > 0 && (
                    <div className="text-[10px]">
                      <span className="text-slate-400 block font-medium mb-1">Equipment Onboard:</span>
                      <div className="flex flex-wrap gap-1">
                        {r.equipment.slice(0, 3).map((eq, i) => (
                          <span key={i} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {r.status === 'AVAILABLE' && clickedPos && (
                    <button
                      onClick={() => handleDispatchSingleUnit(r.resourceId)}
                      disabled={isDeploying}
                      className="w-full mt-2 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1.5 transition shadow"
                    >
                      <Send className="h-3 w-3 text-emerald-400" /> Dispatch to Current Target
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Priority Events Markers */}
        {events.map((evt) => (
          <Marker 
            key={evt.id}
            position={[evt.coordinates.lat, evt.coordinates.lng]}
            // @ts-ignore
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent as any);
                if (onSelectEvent) onSelectEvent(evt.id);
              }
            }}
          >
            <Popup autoPan maxWidth={280}>
              <div className="text-slate-800 font-sans text-xs space-y-1.5">
                <h3 className="font-extrabold text-sm text-slate-900">{evt.title}</h3>
                <p className="text-[11px] text-slate-500">{evt.district} Sector</p>
                <div className="flex justify-between border-t pt-1 text-[11px]">
                  <span>Landslide Probability:</span>
                  <span className="font-bold text-amber-600">{evt.landslideRisk}%</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Flood Probability:</span>
                  <span className="font-bold text-sky-600">{evt.floodRisk ?? 'Model active'}%</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Dynamic Point Query Marker */}
        {clickedPos && (
          <Marker position={[clickedPos.lat, clickedPos.lng]} />
        )}
      </MapContainer>
      
      {/* Side Panel for Point Query, Emergency Logistics & Route Deployment */}
      {clickedPos && (
        <div className="absolute top-3 right-3 bottom-3 z-[1000] w-[370px] max-w-[calc(100%-1.5rem)] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-in slide-in-from-right-4 fade-in duration-200">
          
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Compass className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-black text-xs text-slate-900 tracking-tight leading-none uppercase">Sector Analysis & Dispatch</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Assam Geospatial Sector</p>
              </div>
            </div>
            <button 
              onClick={() => { setClickedPos(null); if (onMapClick) onMapClick(0, 0); }} 
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center font-bold text-base transition"
              title="Close Panel"
            >
              &times;
            </button>
          </div>

          {/* Panel Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 text-xs shrink-0">
            <button
              onClick={() => setSidePanelTab('risk')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 text-[11px] ${
                sidePanelTab === 'risk' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Target className="h-3 w-3" /> Risk AI
            </button>
            <button
              onClick={() => setSidePanelTab('logistics')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 text-[11px] ${
                sidePanelTab === 'logistics' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Truck className="h-3 w-3 text-rose-500" /> Fleet ({resources.filter(r => r.status === 'AVAILABLE').length})
            </button>
            <button
              onClick={() => setSidePanelTab('routes')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 text-[11px] ${
                sidePanelTab === 'routes' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Route className="h-3 w-3 text-emerald-500" /> Routes
            </button>
          </div>

          {/* Panel Content Body */}
          <div className="p-4 overflow-y-auto flex-1 font-sans text-slate-800 custom-scroll space-y-3">
            
            {/* Location Banner */}
            {pointQueryData?.placeName && (
              <div className="text-indigo-800 font-bold bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-100 text-xs flex items-center gap-1.5 shadow-sm">
                <MapPin className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="truncate">{pointQueryData.placeName}</span>
              </div>
            )}

            {/* TAB 1: AI RISK TELEMETRY */}
            {sidePanelTab === 'risk' && (
              pointQueryData && !pointQueryData.error ? (
                <div className="space-y-2 text-xs">
                  
                  {/* Dynamic Risk Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-3 rounded-xl text-white shadow-md">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">CatBoost Landslide Risk</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-slate-950">
                        {pointQueryData.risk_class || 'Moderate'}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-amber-300">
                      {pointQueryData.risk?.current !== undefined ? `${(pointQueryData.risk.current * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10 text-[10px] text-slate-300">
                      <div>24h Forecast: <strong className="text-white">{pointQueryData.forecast?.['24h_mm'] ?? 0} mm</strong></div>
                      <div>Avg Slope: <strong className="text-white">{pointQueryData.slope?.degrees ?? 12}°</strong></div>
                    </div>
                  </div>

                  {/* 2026 Flood Telemetry Card */}
                  <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-sky-800 mb-1 border-b border-sky-200/60 pb-1">
                      <span className="flex items-center gap-1"><Waves className="h-3.5 w-3.5 text-sky-600" /> Flood Susceptibility</span>
                      <span className="text-sky-900 font-black">
                        {pointQueryData.flood?.floodProbability !== null && pointQueryData.flood?.floodProbability !== undefined
                          ? `${(Number(pointQueryData.flood.floodProbability) * 100).toFixed(1)}%`
                          : 'Normal (0.0%)'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">24h Observed Rain:</span>
                      <span className="font-bold text-sky-700">{pointQueryData.rainfall?.['24h_mm'] ?? 0} mm</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Topsoil Moisture:</span>
                      <span className="font-bold text-slate-700">{pointQueryData.soil_moisture?.value ?? '0.42'} m³/m³</span>
                    </div>
                  </div>

                  {/* Quick Deploy Shortcut Button */}
                  <button 
                    onClick={() => setSidePanelTab('logistics')}
                    className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition hover:-translate-y-0.5"
                  >
                    <Truck className="h-4 w-4" /> View Nearby Fleet & Deploy
                  </button>

                  {onCreateEvent && (
                    <button 
                      onClick={() => {
                        onCreateEvent(pointQueryData, clickedPos);
                        setClickedPos(null);
                      }}
                      className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                    >
                      Create Monitored Risk Event
                    </button>
                  )}
                </div>
              ) : pointQueryData?.error ? (
                <div className="text-xs font-bold text-red-600 p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                  {pointQueryData.error}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic animate-pulse py-6 text-center">
                  Extracting multimodal risk telemetry...
                </div>
              )
            )}

            {/* TAB 2: EMERGENCY FLEET & DEPLOY (USER REQUESTED) */}
            {sidePanelTab === 'logistics' && (
              <div className="space-y-3 text-xs">
                
                {/* One-Click Deploy Banner */}
                <div className="bg-gradient-to-r from-rose-600 to-indigo-700 p-3.5 rounded-2xl text-white shadow-xl shadow-rose-900/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-200 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Quick Dispatch Protocol
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <h4 className="font-black text-sm leading-tight">Deploy All First Responders</h4>
                  <p className="text-[10px] text-white/80 leading-relaxed">
                    Instantly allocates nearest Ambulance, NDRF Battalion & Rescue Craft to coordinates.
                  </p>
                  <button
                    onClick={handleDeployAllNearby}
                    disabled={isDeploying}
                    className="w-full py-2.5 px-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition shadow hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5 text-rose-600" /> 
                    {isDeploying ? 'Deploying Emergency Fleet...' : 'DEPLOY TO THIS AREA NOW'}
                  </button>
                </div>

                {/* Nearest Ambulance Card */}
                {resourceSummary?.nearestAmbulance && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2 hover:border-rose-300 transition group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-sm shadow-sm">
                          🚑
                        </span>
                        <div>
                          <h5 className="font-extrabold text-xs text-slate-900 leading-tight">
                            {resourceSummary.nearestAmbulance.name}
                          </h5>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {resourceSummary.nearestAmbulance.location?.name}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        resourceSummary.nearestAmbulance.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {resourceSummary.nearestAmbulance.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg text-[10px]">
                      <div>
                        <span className="text-slate-400 block font-medium">Distance & Speed</span>
                        <strong className="text-slate-800">{resourceSummary.nearestAmbulance.distanceKm} km · {resourceSummary.nearestAmbulance.speedKmh} km/h</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Estimated Arrival</span>
                        <strong className="text-rose-600 font-extrabold">{resourceSummary.nearestAmbulance.etaMinutes} mins</strong>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleDispatchSingleUnit(resourceSummary.nearestAmbulance.resourceId)}
                        disabled={isDeploying || resourceSummary.nearestAmbulance.status !== 'AVAILABLE'}
                        className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition"
                      >
                        <Send className="h-3 w-3" /> Dispatch Ambulance
                      </button>
                      <a
                        href={`tel:${resourceSummary.nearestAmbulance.contact}`}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center"
                        title="Call Hotline"
                      >
                        <Phone className="h-3.5 w-3.5 text-slate-600" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Nearest Rescue Team (NDRF / SDRF) */}
                {resourceSummary?.nearestRescueTeam && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2 hover:border-orange-300 transition group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-sm shadow-sm">
                          🛡️
                        </span>
                        <div>
                          <h5 className="font-extrabold text-xs text-slate-900 leading-tight">
                            {resourceSummary.nearestRescueTeam.name}
                          </h5>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {resourceSummary.nearestRescueTeam.location?.name}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        resourceSummary.nearestRescueTeam.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {resourceSummary.nearestRescueTeam.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg text-[10px]">
                      <div>
                        <span className="text-slate-400 block font-medium">Proximity</span>
                        <strong className="text-slate-800">{resourceSummary.nearestRescueTeam.distanceKm} km</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Rapid ETA</span>
                        <strong className="text-orange-600 font-extrabold">{resourceSummary.nearestRescueTeam.etaMinutes} mins</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDispatchSingleUnit(resourceSummary.nearestRescueTeam.resourceId)}
                      disabled={isDeploying || resourceSummary.nearestRescueTeam.status !== 'AVAILABLE'}
                      className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition"
                    >
                      <ShieldAlert className="h-3 w-3" /> Deploy NDRF / SDRF Team
                    </button>
                  </div>
                )}

                {/* Nearest Hospital Card */}
                {resourceSummary?.nearestHospital && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm shadow-sm">
                        🏥
                      </span>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-extrabold text-xs text-slate-900 truncate">
                          {resourceSummary.nearestHospital.name}
                        </h5>
                        <p className="text-[10px] text-slate-400">{resourceSummary.nearestHospital.distanceKm} km away</p>
                      </div>
                    </div>
                    <div className="bg-blue-50/60 p-2 rounded-lg border border-blue-100 text-[10px] flex justify-between items-center">
                      <span className="text-blue-900 font-semibold">Trauma & ICU Beds</span>
                      <span className="font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded shadow-sm">
                        {resourceSummary.nearestHospital.capacity - resourceSummary.nearestHospital.currentOccupancy} Beds Available
                      </span>
                    </div>
                  </div>
                )}

                {/* Nearest Relief Shelter */}
                {resourceSummary?.nearestShelter && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm shadow-sm">
                        ⛺
                      </span>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-extrabold text-xs text-slate-900 truncate">
                          {resourceSummary.nearestShelter.name}
                        </h5>
                        <p className="text-[10px] text-slate-400">{resourceSummary.nearestShelter.distanceKm} km away</p>
                      </div>
                    </div>
                    <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100 text-[10px] flex justify-between items-center">
                      <span className="text-emerald-900 font-semibold">Shelter Capacity</span>
                      <span className="font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-sm">
                        {resourceSummary.nearestShelter.capacity - resourceSummary.nearestShelter.currentOccupancy} Slots Open
                      </span>
                    </div>
                  </div>
                )}

                {/* Recall Fleet Action */}
                <button
                  onClick={handleResetFleet}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Recall Dispatched Emergency Fleet
                </button>
              </div>
            )}

            {/* TAB 3: SAFE EVACUATION & MEDICAL TRANSIT ROUTES */}
            {sidePanelTab === 'routes' && (
              <div className="space-y-3 text-xs">
                
                {/* Safe Evacuation Route Card */}
                {evacRoutes?.primarySafe && (
                  <div className="bg-white p-3.5 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-2 relative overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Route className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[9px] uppercase">
                          RECOMMENDED SAFE CORRIDOR
                        </span>
                        <h5 className="font-extrabold text-xs text-slate-900 mt-0.5">
                          {evacRoutes.primarySafe.name}
                        </h5>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Corridor Distance</span>
                        <strong className="text-emerald-800 font-black">{evacRoutes.primarySafe.distanceKm} km</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Transit Duration</span>
                        <strong className="text-emerald-800 font-black">{evacRoutes.primarySafe.estimatedDurationMinutes} mins</strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Highland corridor avoiding riverbed flood inundation and unstable cut-slopes.
                    </p>
                  </div>
                )}

                {/* Hospital Transit Route Card */}
                {evacRoutes?.hospitalRoute && (
                  <div className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <HeartPulse className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-black text-[9px] uppercase">
                          TRAUMA MEDICAL CORRIDOR
                        </span>
                        <h5 className="font-extrabold text-xs text-slate-900 mt-0.5">
                          {evacRoutes.hospitalRoute.name}
                        </h5>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Transit Distance</span>
                        <strong className="text-blue-900 font-black">{evacRoutes.hospitalRoute.distanceKm} km</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Ambulance ETA</span>
                        <strong className="text-blue-900 font-black">{evacRoutes.hospitalRoute.estimatedDurationMinutes} mins</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Compromised Hazard Road Warning */}
                {evacRoutes?.compromisedHazardRoad && (
                  <div className="bg-rose-50 border-2 border-rose-300 p-3.5 rounded-2xl text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-xs">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>HAZARD ALERT: ROAD BLOCKED / COMPROMISED</span>
                    </div>
                    <p className="font-bold text-slate-800 text-[11px]">
                      {evacRoutes.compromisedHazardRoad.name}
                    </p>
                    <p className="text-[10px] text-rose-700 bg-white/80 p-2 rounded-lg border border-rose-200 font-medium">
                      ⚠️ {evacRoutes.compromisedHazardRoad.hazardReason}
                    </p>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
