import React, { useState } from 'react';
import { Layers, CheckSquare, Square, Target, Waves, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { HazardEvent } from '../../types';

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface InteractiveMapProps {
  events: HazardEvent[];
  selectedEventId?: string;
  onSelectEvent?: (eventId: string) => void;
  heightClass?: string;
  showLayerControls?: boolean;
  activeLayersOverride?: Record<string, boolean>;
  onMapClick?: (lat: number, lng: number) => void;
  pointQueryData?: any; // To display clicked point risk
  onCreateEvent?: (data: any, pos: {lat: number, lng: number}) => void;
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
  onCreateEvent
}) => {
  const [layers, setLayers] = useState<Record<string, boolean>>({
    floodRisk: true,
    baselineSusceptibility: true, // Renamed from landslideRisk to be precise
    rainfall: true,
    soilMoisture: true,
    satelliteChange: true,
    roads: true,
    population: true,
    infrastructure: true,
    ...activeLayersOverride
  });

  const [clickedPos, setClickedPos] = useState<{lat: number, lng: number} | null>(null);
  const [activeRoutes, setActiveRoutes] = useState<{affected: [number, number][], alternate: [number, number][]} | null>(null);

  // Effect to fetch routing when an event is selected
  React.useEffect(() => {
    if (selectedEventId && events) {
      const evt = events.find(e => e.id === selectedEventId);
      if (evt && (evt.combinedPriority === 'CRITICAL' || evt.combinedPriority === 'HIGH')) {
        // Mock a route calculation around the event epicenter
        const lat = evt.coordinates.lat;
        const lng = evt.coordinates.lng;
        // Start point a bit North-West, End point South-East
        const start = `${lng - 0.05},${lat + 0.05}`;
        const end = `${lng + 0.05},${lat - 0.05}`;
        
        // Fetch affected route (shortest path)
        fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`)
          .then(res => res.json())
          .then(data => {
            if (data.routes && data.routes.length > 0) {
              const affectedCoords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
              
              // Mock alternate route by adding a waypoint to force it around
              const avoidWaypoint = `${lng + 0.1},${lat + 0.1}`;
              fetch(`https://router.project-osrm.org/route/v1/driving/${start};${avoidWaypoint};${end}?overview=full&geometries=geojson`)
                .then(res => res.json())
                .then(altData => {
                  if (altData.routes && altData.routes.length > 0) {
                    const altCoords = altData.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
                    setActiveRoutes({ affected: affectedCoords, alternate: altCoords });
                  }
                });
            }
          })
          .catch(err => console.error("OSRM Error:", err));
      } else {
        setActiveRoutes(null);
      }
    } else {
      setActiveRoutes(null);
    }
  }, [selectedEventId, events]);

  const toggleLayer = (key: string) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (onMapClick) {
      setClickedPos({ lat, lng });
      onMapClick(lat, lng);
    }
  };

  // Center of Assam/Himalayas area
  const center: [number, number] = [26.14, 91.73];
  
  return (
    <div className={`relative w-full ${heightClass} bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex flex-col`}>
      {/* Top Map Toolbar */}
      <div className="absolute top-3 left-3 z-[1000] flex max-w-[calc(100%-5.5rem)] items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-200 text-xs shadow-md">
        <span className="flex items-center gap-1.5 font-bold text-sky-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          LIVE MAP · ASSAM SECTOR
        </span>
        <span className="text-slate-600">|</span>
        <span className="hidden text-slate-400 font-mono sm:inline">OpenStreetMap</span>
      </div>

      {/* Layer Controls */}
      {showLayerControls && (
        <div className="absolute bottom-4 left-3 z-[1000] w-[210px] max-w-[calc(100%-1.5rem)] bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700/60 shadow-xl text-slate-200 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-sky-400" /> GIS LAYERS
            </span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {[
              { id: 'baselineSusceptibility', label: 'Baseline Susceptibility', color: 'text-amber-400' },
              { id: 'floodRisk', label: 'Flood Risk (Coming Soon)', color: 'text-blue-400' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => toggleLayer(item.id)}
                className="w-full flex items-center justify-between py-1 px-1.5 hover:bg-slate-800/80 rounded transition text-[11px]"
              >
                <span className={`truncate ${item.color}`}>{item.label}</span>
                {layers[item.id] ? (
                  <CheckSquare className="h-3.5 w-3.5 text-sky-400 shrink-0 ml-2" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-slate-600 shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leaflet Map */}
      <MapContainer 
        center={center} 
        zoom={7} 
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

        {/* Baseline Susceptibility Raster Tile Layer (from Python ML Service) */}
        {layers.baselineSusceptibility && (
          <TileLayer
            url="http://127.0.0.1:8000/tiles/baseline/{z}/{x}/{y}.png"
            opacity={0.6}
            zIndex={10}
          />
        )}

        {/* Road Impact Routing */}
        {activeRoutes && layers.roads && (
          <>
            <Polyline positions={activeRoutes.affected} pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.8, dashArray: '5, 10' }} />
            <Polyline positions={activeRoutes.alternate} pathOptions={{ color: '#10b981', weight: 4, opacity: 0.8 }} />
          </>
        )}

        {/* Event Markers */}
        {events.map((evt) => (
          <Marker 
            key={evt.id}
            position={[evt.coordinates.lat, evt.coordinates.lng]}
            // @ts-ignore - EventedProps is missing in strict mode
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent as any);
                if (onSelectEvent) onSelectEvent(evt.id);
              }
            }}
          >
            <Popup autoPan keepInView maxWidth={280} className="event-map-popup">
              <div className="text-slate-800 font-sans">
                <h3 className="font-bold text-sm mb-1">{evt.title}</h3>
                <p className="text-xs">Location: {evt.district}</p>
                <p className="text-xs">Landslide Risk: <span className="font-bold text-amber-600">{evt.landslideRisk}%</span></p>
                <p className="text-xs">Flood Risk: <span className="font-bold text-sky-600">{evt.floodRisk !== undefined ? evt.floodRisk + '%' : 'Coming Soon'}</span></p>
                <p className="text-[10px] mt-1 uppercase text-slate-500 font-bold">Status: {evt.status}</p>
                {activeRoutes && selectedEventId === evt.id && (
                  <div className="mt-2 bg-red-50 p-2 rounded border border-red-100">
                    <p className="text-[10px] font-bold text-red-600 mb-1">ROAD IMPACT DETECTED</p>
                    <div className="flex items-center gap-1 text-[9px] text-slate-600">
                      <span className="h-2 w-2 bg-red-500 rounded-full inline-block" /> Affected Route
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-600">
                      <span className="h-2 w-2 bg-emerald-500 rounded-full inline-block" /> Recommended Alternate
                    </div>
                    <p className="text-[9px] mt-1 font-semibold">Est. Alert Period: 24–72 hrs</p>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Dynamic Point Query Marker */}
        {clickedPos && (
          <Marker position={[clickedPos.lat, clickedPos.lng]} />
        )}
      </MapContainer>
      
      {/* Absolute Side Panel for Point Query Analysis (Replaces Popup) */}
      {clickedPos && (
        <div className="absolute top-3 right-3 bottom-3 z-[1000] w-[340px] max-w-[calc(100%-1.5rem)] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-right-4 fade-in duration-200">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
              <Target className="h-4 w-4 text-indigo-600" /> Point Query Analysis
            </h3>
            <button 
              onClick={() => { setClickedPos(null); if (onMapClick) onMapClick(0, 0); }} 
              className="text-slate-400 hover:text-slate-600 font-bold text-lg leading-none"
              title="Close Panel"
            >
              &times;
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 font-sans text-slate-800">
            {pointQueryData && !pointQueryData.error ? (
              <div className="space-y-1.5 text-xs">
                {pointQueryData.placeName && (
                  <div className="mb-3 text-indigo-700 font-bold bg-indigo-50 p-2 rounded border border-indigo-100/50">
                    <MapPin className="h-3.5 w-3.5 inline mr-1" />
                    {pointQueryData.placeName}
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Baseline Susceptibility</span>
                  <span className="font-bold">{pointQueryData.baseline?.susceptibility || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Dynamic Risk</span>
                  <span className="font-bold text-amber-600">{pointQueryData.risk?.current ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Class</span>
                  <span className="font-bold text-slate-700 bg-slate-100 px-1 rounded">{pointQueryData.risk_class}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-slate-500">24h Rainfall</span>
                  <span className="font-bold text-sky-600">{pointQueryData.rainfall?.['24h_mm'] ?? 'N/A'} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">24h Forecast</span>
                  <span className="font-bold text-purple-600">{pointQueryData.forecast?.['24h_mm'] ?? 'N/A'} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Average Slope</span>
                  <span className="font-bold text-slate-700">
                    {pointQueryData.slope?.degrees !== undefined && pointQueryData.slope?.degrees !== null 
                      ? `${pointQueryData.slope.degrees}°` 
                      : 'Unavailable'}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-slate-500">Sentinel-1 SAR Change</span>
                  <span className="font-bold text-slate-700">
                    {pointQueryData.sentinel1?.available && pointQueryData.sentinel1?.change !== null && pointQueryData.sentinel1?.change !== undefined
                      ? `${Number(pointQueryData.sentinel1.change).toFixed(3)} dB` 
                      : 'Unavailable'}
                  </span>
                </div>
                {/* FLOOD TELEMETRY BLOCK */}
                <div className="bg-slate-50 border border-slate-200 rounded p-1.5 mt-2 mb-1 space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-sky-600 mb-1 border-b pb-0.5">
                    <Waves className="h-3 w-3" /> 2026 Flood Telemetry
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">S1 VV Backscatter</span>
                    <span className="font-bold text-slate-700">
                      {pointQueryData.flood?.sentinel1?.vv !== null && pointQueryData.flood?.sentinel1?.vv !== undefined 
                        ? `${Number(pointQueryData.flood.sentinel1.vv).toFixed(2)} dB` : 'Unavailable'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">S1 VH Backscatter</span>
                    <span className="font-bold text-slate-700">
                      {pointQueryData.flood?.sentinel1?.vh !== null && pointQueryData.flood?.sentinel1?.vh !== undefined 
                        ? `${Number(pointQueryData.flood.sentinel1.vh).toFixed(2)} dB` : 'Unavailable'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">S1 VV Change</span>
                    <span className="font-bold text-slate-700">
                      {pointQueryData.flood?.sentinel1?.vvChange !== null && pointQueryData.flood?.sentinel1?.vvChange !== undefined 
                        ? `${Number(pointQueryData.flood.sentinel1.vvChange).toFixed(2)} dB` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Current: {pointQueryData.flood?.sentinel1?.currentDate || 'N/A'}</span>
                    <span>Prev: {pointQueryData.flood?.sentinel1?.previousDate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-slate-500">2026 Rainfall</span>
                    <span className={`font-bold ${pointQueryData.flood?.available === false && pointQueryData.flood?.missingFeatures?.includes("rain_intensity") ? 'text-red-500' : 'text-emerald-600'}`}>
                      {pointQueryData.flood?.available === false && pointQueryData.flood?.missingFeatures?.includes("rain_intensity") 
                        ? 'Unavailable' : `${pointQueryData.flood?.rainfall?.intensity || 'Available'} mm`}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-sky-600 font-bold">Flood Probability</span>
                    <span className="font-bold text-slate-900">
                      {pointQueryData.flood?.floodProbability !== null && pointQueryData.flood?.floodProbability !== undefined
                        ? `${(Number(pointQueryData.flood.floodProbability) * 100).toFixed(1)}%` 
                        : 'Pending Rainfall Data'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-1 mb-1 text-[9px] font-bold uppercase tracking-widest text-sky-600">
                    <Target className="h-3 w-3" /> Sentinel-2 Optical Data
                  </div>
                  {pointQueryData.sentinel2?.available ? (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Observation Date</span>
                        <span className="font-bold text-slate-700">{pointQueryData.sentinel2.latest_date}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Cloud Status</span>
                        <span className={`font-bold ${pointQueryData.sentinel2.cloudy ? 'text-red-500' : 'text-emerald-600'}`}>
                          {pointQueryData.sentinel2.cloudy ? 'Cloudy' : 'Clear'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">NDVI (Vegetation)</span>
                        <span className="font-bold text-slate-700">{pointQueryData.sentinel2.NDVI}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">NDWI (Water)</span>
                        <span className="font-bold text-slate-700">{pointQueryData.sentinel2.NDWI}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic">No recent cloud-free observation</div>
                  )}
                </div>
                {pointQueryData.metadata && (
                  <div className="flex justify-between mt-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 text-[10px]">Model Version</span>
                    <span className="font-bold text-slate-700 text-[10px]">{pointQueryData.metadata.model_version}</span>
                  </div>
                )}
                <div className="flex justify-between mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Topsoil Moisture</span>
                  <span className="font-bold text-slate-700">
                    {pointQueryData.soil_moisture?.available
                      ? `${pointQueryData.soil_moisture.value} ${pointQueryData.soil_moisture.unit}`
                      : 'Unavailable'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 mt-3 leading-tight mb-2 italic">
                  * This indicator combines historical baseline susceptibility with current and forecast rainfall conditions. It is not a statistically validated probability of landslide occurrence.
                </p>
                {onCreateEvent && (
                  <button 
                    onClick={() => {
                      onCreateEvent(pointQueryData, clickedPos);
                      setClickedPos(null);
                    }}
                    className="w-full py-2 bg-indigo-600 text-white rounded text-xs font-extrabold mt-3 hover:bg-indigo-700 transition shadow-md"
                  >
                    Create Risk Event
                  </button>
                )}
              </div>
            ) : pointQueryData?.error ? (
              <div className="text-sm font-bold text-red-500 py-4 text-center bg-red-50 rounded">
                {pointQueryData.error}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic animate-pulse py-6 text-center">
                Analyzing geospatial risk data...
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
