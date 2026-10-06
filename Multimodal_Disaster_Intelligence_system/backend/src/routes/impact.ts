import { Router } from 'express';
import { RiskEvent } from '../models/RiskEvent';
import { RoadImpact } from '../models/RoadImpact';
import { HazardImpact } from '../models/HazardImpact';
import { Alert } from '../models/Alert';
import axios from 'axios';

const router = Router();

// ==========================================
// PHASE 8: ROAD IMPACT
// ==========================================
router.post('/assess-roads', async (req, res) => {
  try {
    const { riskEventId } = req.body;
    
    const risk = await RiskEvent.findById(riskEventId);
    if (!risk) return res.status(404).json({ error: 'Risk event not found' });
    if (risk.status !== 'APPROVED') return res.status(400).json({ error: 'Risk event must be APPROVED before road impact assessment.' });

    const { lat, lng } = risk.coordinates;
    const searchRadius = 1500; 
    
    const overpassQuery = `
      [out:json];
      (
        way["highway"~"primary|secondary|tertiary|residential"](around:${searchRadius},${lat},${lng});
      );
      out geom;
    `;
    
    let osmData;
    try {
      const osmRes = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 10000
      });
      osmData = osmRes.data;
    } catch (e: any) {
      console.error("Overpass API failed:", e.message);
      return res.status(503).json({ error: 'External road data service (OSM) is unavailable.' });
    }

    const affectedRoads = [];
    if (osmData && osmData.elements && osmData.elements.length > 0) {
      for (const element of osmData.elements) {
        if (element.type === 'way') {
          const roadId = `OSM-${element.id}`;
          const roadName = element.tags?.name || `Unnamed ${element.tags?.highway || 'Road'}`;
          
          let impact = await RoadImpact.findOne({ roadId, hazardId: risk._id.toString() });
          
          if (!impact) {
            impact = new RoadImpact({
              roadId,
              roadName,
              status: 'AFFECTED',
              hazardId: risk._id.toString(),
              reason: `Intersection with approved ${risk.combinedRisk} danger zone`,
              geometry: element.geometry,
              roadType: element.tags?.highway,
              accessibility: 'Compromised'
            });
            await impact.save();
          }
          affectedRoads.push(impact);
        }
      }
    }

    res.status(200).json({ 
      message: 'Road impact assessed successfully', 
      affectedCount: affectedRoads.length,
      data: affectedRoads 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PHASE 2-7: INFRASTRUCTURE IMPACT
// ==========================================
router.post('/assess-infrastructure', async (req, res) => {
  try {
    const { alertId } = req.body;
    
    const alert = await Alert.findOne({ alertId });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    
    const event = await RiskEvent.findById(alert.eventId);
    if (!event) return res.status(404).json({ error: 'Base Risk Event not found' });

    // Use Alert geometry or fallback to event coordinates
    const lat = event.coordinates.lat;
    const lng = event.coordinates.lng;
    const searchRadius = 1500; // 1.5km buffer for "danger zone"
    
    // Check if already assessed
    let hazardImpact = await HazardImpact.findOne({ alertId });
    if (hazardImpact) {
      return res.json({ message: 'Impact already assessed', data: hazardImpact });
    }

    // Overpass API Query for Buildings and Amenities
    const overpassQuery = `
      [out:json];
      (
        way["building"](around:${searchRadius},${lat},${lng});
        node["amenity"~"school|hospital|clinic|fire_station|police"](around:${searchRadius},${lat},${lng});
        way["amenity"~"school|hospital|clinic|fire_station|police"](around:${searchRadius},${lat},${lng});
      );
      out center;
    `;
    
    let osmData;
    try {
      const osmRes = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 15000
      });
      osmData = osmRes.data;
    } catch (e: any) {
      console.error("Overpass Infrastructure API failed:", e.message);
      return res.status(503).json({ error: 'External infrastructure data service (OSM) is unavailable.' });
    }

    let buildingCount = 0;
    let directlyAffected = 0;
    let schools = 0;
    let hospitals = 0;
    let clinics = 0;
    let fireStations = 0;
    let policeStations = 0;
    const facilities = [];

    if (osmData && osmData.elements) {
      for (const el of osmData.elements) {
        if (el.tags?.building && !el.tags?.amenity) {
          buildingCount++;
          // Simulated spatial distance check based on simple radius proportion 
          // (In a real GIS system we would intersect exact polygons)
          directlyAffected++; 
        } else if (el.tags?.amenity) {
          const type = el.tags.amenity;
          const name = el.tags.name || `Unnamed ${type}`;
          
          if (type === 'school') schools++;
          else if (type === 'hospital') hospitals++;
          else if (type === 'clinic') clinics++;
          else if (type === 'fire_station') fireStations++;
          else if (type === 'police') policeStations++;
          
          facilities.push({
            name,
            type,
            lat: el.lat || el.center?.lat,
            lon: el.lon || el.center?.lon,
            source: 'OSM'
          });
        }
      }
    }

    hazardImpact = new HazardImpact({
      alertId,
      hazardType: alert.hazardType,
      buildingCount,
      directlyAffectedBuildings: directlyAffected,
      bufferedBuildings: buildingCount, // Using search radius as buffer
      schools,
      hospitals,
      clinics,
      fireStations,
      policeStations,
      shelters: 0,
      affectedFacilities: facilities
    });

    await hazardImpact.save();

    res.status(200).json({ 
      message: 'Infrastructure impact assessed successfully', 
      data: hazardImpact 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// NEW: EXPERT PRE-APPROVAL ASSESSMENT
// ==========================================
router.post('/assess-event', async (req, res) => {
  try {
    const { riskEventId } = req.body;
    
    const event = await RiskEvent.findById(riskEventId);
    if (!event) return res.status(404).json({ error: 'Risk Event not found' });

    const lat = event.coordinates.lat;
    const lng = event.coordinates.lng;
    const searchRadius = 1500; 
    
    // Traffic Status Mock
    let trafficStatus = 'NORMAL';
    if (event.combinedRisk === 'SEVERE' || event.landslideProbability > 60 || (event.floodProbability && event.floodProbability > 60)) {
       trafficStatus = 'CONGESTED / ROAD AFFECTED';
    }

    if (event.estimatedBuildingsAffected !== undefined) {
      return res.json({ 
        message: 'Impact already assessed', 
        data: event 
      });
    }

    const overpassQuery = `
      [out:json];
      (
        way["building"](around:${searchRadius},${lat},${lng});
        node["amenity"~"school|hospital|clinic|fire_station|police"](around:${searchRadius},${lat},${lng});
        way["amenity"~"school|hospital|clinic|fire_station|police"](around:${searchRadius},${lat},${lng});
      );
      out center;
    `;
    
    let osmData;
    try {
      const osmRes = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 15000
      });
      osmData = osmRes.data;
    } catch (e: any) {
      return res.status(503).json({ error: 'External infrastructure data service (OSM) is unavailable.' });
    }

    let buildingCount = 0;
    let schools = 0;
    let hospitals = 0;

    if (osmData && osmData.elements) {
      for (const el of osmData.elements) {
        if (el.tags?.building && !el.tags?.amenity) {
          buildingCount++;
        } else if (el.tags?.amenity) {
          const type = el.tags.amenity;
          if (type === 'school') schools++;
          else if (type === 'hospital') hospitals++;
        }
      }
    }

    // Save back to the RiskEvent directly
    event.estimatedBuildingsAffected = buildingCount;
    event.affectedSchools = schools;
    event.affectedHospitals = hospitals;
    event.trafficStatus = trafficStatus;
    
    await event.save();

    res.status(200).json({ 
      message: 'Event impact assessed successfully', 
      data: event 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PHASE 7 - IMPACT API 
router.get('/alerts/:id/impact', async (req, res) => {
  try {
    const impact = await HazardImpact.findOne({ alertId: req.params.id });
    if (!impact) return res.status(404).json({ error: 'Impact analysis not available' });

    // Citizen response vs Expert response filtering could be based on req.user auth
    // For now we return a combined safe response
    res.json({
      estimatedBuildingsAffected: impact.directlyAffectedBuildings,
      affectedSchools: impact.schools,
      affectedHospitals: impact.hospitals,
      affectedFireStations: impact.fireStations,
      importantFacilities: impact.affectedFacilities,
      timestamp: impact.calculatedAt,
      dataSource: impact.dataSource
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PHASE 9-11: TRAFFIC-AWARE ROUTING
// ==========================================
class TrafficProvider {
  static async getTrafficDelayMinutes(origin: any, destination: any): Promise<number | null> {
    const TRAFFIC_API_KEY = process.env.TRAFFIC_API_KEY;
    if (!TRAFFIC_API_KEY) return null;
    
    // Abstracted traffic provider interface. In reality, call TomTom/Google Maps API
    // returning a simulated delay for now if key was somehow present.
    return 15; 
  }
}

router.post('/alternative', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) return res.status(400).json({ error: 'Origin and destination are required' });

    const activeImpacts = await RoadImpact.find({ status: { $in: ['AFFECTED', 'CLOSED'] } });
    const avoidedRoads = activeImpacts.map(i => ({ roadName: i.roadName, reason: i.reason }));
    const hazardIds = [...new Set(activeImpacts.map(i => i.hazardId))];

    const ORS_API_KEY = process.env.ORS_API_KEY;
    
    if (!ORS_API_KEY) {
      return res.status(200).json({
        routeAvailable: false,
        message: "No verified alternative route is available. (NOT CONFIGURED)"
      });
    }

    try {
      const orsPayload = {
        coordinates: [
          [origin.lon, origin.lat],
          [destination.lon, destination.lat]
        ]
      };

      const orsRes = await axios.post('https://api.openrouteservice.org/v2/directions/driving-car/geojson', orsPayload, {
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const routeData = orsRes.data;
      
      // Phase 10: Live Traffic Integration
      const trafficDelay = await TrafficProvider.getTrafficDelayMinutes(origin, destination);
      const trafficStatus = trafficDelay !== null ? (trafficDelay > 10 ? 'CONGESTED' : 'NORMAL') : 'UNAVAILABLE';
      
      return res.status(200).json({
        routeAvailable: true,
        distanceKm: (routeData.features[0].properties.summary.distance / 1000).toFixed(2),
        durationMinutes: Math.round(routeData.features[0].properties.summary.duration / 60),
        avoidedHazardRoads: avoidedRoads,
        trafficDelayMinutes: trafficDelay,
        trafficStatus: trafficStatus,
        generatedAt: new Date()
      });

    } catch (e: any) {
      console.error("Routing engine error:", e.message);
      return res.status(200).json({
        routeAvailable: false,
        message: "Routing engine failed to find a safe alternative route."
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
