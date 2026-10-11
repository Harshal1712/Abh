import { Router } from 'express';
import { Resource, IResource } from '../models/Resource';
import axios from 'axios';

const router = Router();

// Haversine formula to calculate geodesic distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Generate interpolated waypoint coordinates for emergency route visualization
function generateRoutePath(start: [number, number], end: [number, number], detourFactor: number = 0): [number, number][] {
  const points: [number, number][] = [];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Linear interpolation
    let lat = start[0] + (end[0] - start[0]) * t;
    let lng = start[1] + (end[1] - start[1]) * t;
    // Add realistic curved detour simulating road network
    if (i > 0 && i < steps) {
      const curve = Math.sin(t * Math.PI) * detourFactor;
      lat += curve * 0.015;
      lng += curve * 0.02;
    }
    points.push([Math.round(lat * 10000) / 10000, Math.round(lng * 10000) / 10000]);
  }
  return points;
}

// Initial Emergency Fleet & Infrastructure in Assam Disaster Belt
const INITIAL_RESOURCES = [
  // AMBULANCES WITH DRIVER CONTACTS & VEHICLE DETAILS
  {
    resourceId: 'AMB-108-GHY01',
    name: '108 ALS Trauma Ambulance (Dispur Base)',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    location: {
      name: 'Dispur Medical Center, Guwahati',
      coordinates: { lat: 26.1450, lng: 91.7920 },
    },
    contact: '108 / +91-361-2234001',
    driverName: 'Ranjit Das',
    driverPhone: '+91 98640 12345',
    vehicleNumber: 'AS-01-EA-1081',
    speedKmh: 55,
    equipment: ['Ventilator', 'ECG Monitor', 'Oxygen Supply', 'Defibrillator', 'First Aid Trauma Kit'],
  },
  {
    resourceId: 'AMB-108-KHN02',
    name: '108 Khanapara Rapid Hill Response Ambulance',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    location: {
      name: 'Khanapara Transit Post, Guwahati',
      coordinates: { lat: 26.1280, lng: 91.8210 },
    },
    contact: '108 / +91-361-2345091',
    driverName: 'Bikash Bora',
    driverPhone: '+91 94350 88219',
    vehicleNumber: 'AS-01-GC-4092',
    speedKmh: 52,
    equipment: ['Oxygen Supply', 'Spine Board', 'Suction Machine', '4x4 Hill Terrain Drive', 'First Aid Kit'],
  },
  {
    resourceId: 'AMB-108-KMR03',
    name: '108 Emergency Ambulance (Kamrup Rural Unit)',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    location: {
      name: 'Kamrup Rural Community Health Post',
      coordinates: { lat: 26.2200, lng: 91.6450 },
    },
    contact: '108 / +91-361-2891102',
    driverName: 'Suraj Gogoi',
    driverPhone: '+91 98540 66782',
    vehicleNumber: 'AS-01-EZ-7731',
    speedKmh: 50,
    equipment: ['Oxygen Supply', 'Stretcher', 'Splints', 'Critical Care Monitor'],
  },
  {
    resourceId: 'AMB-108-HFL04',
    name: '108 Mountain Terrain 4x4 ALS Ambulance (Haflong)',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    location: {
      name: 'Haflong Civil Hospital Hill Post, Dima Hasao',
      coordinates: { lat: 25.1720, lng: 93.0290 },
    },
    contact: '108 / +91-3673-236108',
    driverName: 'Lalringthang Hmar',
    driverPhone: '+91 96120 44321',
    vehicleNumber: 'AS-08-M-1080',
    speedKmh: 45,
    equipment: ['4x4 Mountain Winch', 'Highland Trauma Stretcher', 'Cardiac Monitor', 'Portable Oxygen System'],
  },
  {
    resourceId: 'AMB-108-SIL05',
    name: '108 Barak Valley Emergency Ambulance (Silchar)',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    location: {
      name: 'Silchar Civil Hospital Transit Hub',
      coordinates: { lat: 24.8320, lng: 92.7830 },
    },
    contact: '108 / +91-3842-245108',
    driverName: 'Pranab Nath',
    driverPhone: '+91 97060 99451',
    vehicleNumber: 'AS-11-BC-1085',
    speedKmh: 48,
    equipment: ['Emergency Resuscitator', 'Portable Ventilator', 'Trauma Kit'],
  },
  {
    resourceId: 'AMB-108-TEZ06',
    name: '108 Critical Care Ambulance (Tezpur Sector)',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    location: {
      name: 'Mission Chariali Emergency Hub, Tezpur',
      coordinates: { lat: 26.6500, lng: 92.7950 },
    },
    contact: '108 / +91-3712-255108',
    driverName: 'Dipankar Saikia',
    driverPhone: '+91 98642 77103',
    vehicleNumber: 'AS-12-E-1084',
    speedKmh: 50,
    equipment: ['Cardiac Monitor', 'Advanced Airway Kit', 'Spine Board', 'Suction Machine'],
  },
  {
    resourceId: 'AMB-108-DIB07',
    name: '108 Rapid Transit Ambulance (Dibrugarh Unit)',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    location: {
      name: 'Borbheta Emergency Post, Dibrugarh',
      coordinates: { lat: 27.4750, lng: 94.9150 },
    },
    contact: '108 / +91-373-2321108',
    driverName: 'Nayanmoni Dutta',
    driverPhone: '+91 94351 22904',
    vehicleNumber: 'AS-06-K-1089',
    speedKmh: 48,
    equipment: ['Portable Ventilator', 'Trauma Kit', 'Burn Dressing Packs'],
  },
  {
    resourceId: 'AMB-108-DAR08',
    name: '108 Darrang Emergency Trauma Ambulance (Mangaldai Hub)',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    location: {
      name: 'Mangaldai Civil Hospital, Darrang',
      coordinates: { lat: 26.4365, lng: 92.0315 },
    },
    contact: '108 / +91-3713-222108',
    driverName: 'Hitesh Nath',
    driverPhone: '+91 94350 44108',
    vehicleNumber: 'AS-13-B-1088',
    speedKmh: 52,
    equipment: ['Ventilator', 'Oxygen Concentrator', 'ECG Monitor', 'Emergency Splints', 'Trauma Pack'],
  },

  // RESCUE TEAMS / NDRF / SDRF
  {
    resourceId: 'NDRF-01-PATGAON',
    name: '1st Bn NDRF Rapid Action Battalion',
    type: 'RESCUE_TEAM',
    status: 'AVAILABLE',
    location: {
      name: 'NDRF Base Patgaon, Kamrup',
      coordinates: { lat: 26.1150, lng: 91.6620 },
    },
    contact: '+91-361-2840284 / NDRF Control',
    speedKmh: 45,
    equipment: ['Inflatable Rescue Rafts', 'Hydraulic Cutters', 'Life Jackets', 'Satellite Comm (SATPHONE)', 'Search Cameras'],
  },
  {
    resourceId: 'SDRF-ASSAM-BARPETA',
    name: 'Assam SDRF Water Rescue Unit (Barpeta)',
    type: 'RESCUE_TEAM',
    status: 'AVAILABLE',
    location: {
      name: 'SDRF Fire Station, Barpeta',
      coordinates: { lat: 26.3210, lng: 91.0100 },
    },
    contact: '101 / +91-3665-252101',
    speedKmh: 42,
    equipment: ['Divers Kit', 'Emergency Medical Packs', 'Chain Saws', 'Flood Rescue Ropes'],
  },
  {
    resourceId: 'NDRF-03-SILCHAR',
    name: 'NDRF Sub-Team Flood Response Unit (Silchar)',
    type: 'RESCUE_TEAM',
    status: 'AVAILABLE',
    location: {
      name: 'Tarapur Emergency Outpost, Silchar',
      coordinates: { lat: 24.8350, lng: 92.7800 },
    },
    contact: '+91-3842-233400',
    speedKmh: 40,
    equipment: ['Rescue Boats', 'High-Output Water Pumps', 'Emergency Lighting Towers', 'Medical Trauma Bags'],
  },

  // RESCUE BOATS
  {
    resourceId: 'BOAT-SDRF-GHY01',
    name: 'SDRF Brahmaputra Motorized Rescue Boat 01',
    type: 'RESCUE_BOAT',
    status: 'AVAILABLE',
    location: {
      name: 'Pandu Port Ghat, Guwahati',
      coordinates: { lat: 26.1850, lng: 91.7100 },
    },
    contact: 'SDRF Boat Patrol: 112',
    capacity: 18,
    currentOccupancy: 0,
    speedKmh: 35,
    equipment: ['Yamaha 40HP OBM', '20 Life Jackets', 'Floats', 'Throw Bags', 'First Aid Box'],
  },
  {
    resourceId: 'BOAT-NDRF-KMR02',
    name: 'NDRF Inflatable Gemini Craft 02',
    type: 'RESCUE_BOAT',
    status: 'AVAILABLE',
    location: {
      name: 'Saraighat Emergency Pier, Kamrup',
      coordinates: { lat: 26.2100, lng: 91.6800 },
    },
    contact: 'NDRF Marine Unit: 1077',
    capacity: 14,
    currentOccupancy: 0,
    speedKmh: 30,
    equipment: ['Inflatable Hull', '30HP Outboard Motor', 'Night Vision Searchlight', 'Life Buoys'],
  },

  // EMERGENCY HOSPITALS
  {
    resourceId: 'HOSP-GMCH-GHY',
    name: 'Gauhati Medical College & Hospital (GMCH)',
    type: 'HOSPITAL',
    status: 'AVAILABLE',
    location: {
      name: 'Bhangagarh, Guwahati',
      coordinates: { lat: 26.1550, lng: 91.7750 },
    },
    contact: '+91-361-2529457',
    capacity: 250,
    currentOccupancy: 188,
    speedKmh: 0,
    elevationMeters: 55,
    isLandslideSafe: true,
    equipment: ['Level-1 Trauma Center', '45 ICU Beds Available', 'Blood Bank (All Groups)', '24/7 Emergency Surgery'],
  },
  {
    resourceId: 'HOSP-AIIMS-GHY',
    name: 'AIIMS Guwahati Super Specialty & Trauma Center',
    type: 'HOSPITAL',
    status: 'AVAILABLE',
    location: {
      name: 'Changsari, Kamrup',
      coordinates: { lat: 26.2350, lng: 91.6320 },
    },
    contact: '+91-361-2912000',
    capacity: 180,
    currentOccupancy: 95,
    speedKmh: 0,
    elevationMeters: 62,
    isLandslideSafe: true,
    equipment: ['Advanced Burn Care', 'Trauma Critical Care', '60 Ventilators', 'Telemedicine Emergency Wing'],
  },

  // RELIEF SHELTERS & LANDSLIDE-SAFE HIGH GROUND BEDROCK HAVENS
  {
    resourceId: 'SHELTER-KAMRUP-01',
    name: 'Kamrup District Flood Relief & Evacuation Shelter',
    type: 'SHELTER',
    status: 'AVAILABLE',
    location: {
      name: 'Amingaon Sports Complex, Kamrup',
      coordinates: { lat: 26.1820, lng: 91.6880 },
    },
    contact: '+91-361-2680011 / DC Kamrup',
    capacity: 950,
    currentOccupancy: 210,
    speedKmh: 0,
    elevationMeters: 78,
    isLandslideSafe: true,
    equipment: ['Emergency Food Rations', 'Water Purification Units', 'Sanitary Facilities', 'Backup Generators', 'Medical Camp'],
  },
  {
    resourceId: 'SHELTER-DISPUR-02',
    name: 'Dispur Multi-Purpose Disaster Relief Center',
    type: 'SHELTER',
    status: 'AVAILABLE',
    location: {
      name: 'Dispur Stadium Enclave, Guwahati',
      coordinates: { lat: 26.1410, lng: 91.7910 },
    },
    contact: '+91-361-2261012',
    capacity: 1400,
    currentOccupancy: 340,
    speedKmh: 0,
    elevationMeters: 85,
    isLandslideSafe: true,
    equipment: ['Community Kitchen', 'Bedding & Blankets', 'First Aid Station', 'Baby Care Facility'],
  },
  {
    resourceId: 'SHELTER-HAFLONG-03',
    name: 'Haflong Government College Highland Plateau Safe Camp',
    type: 'SHELTER',
    status: 'AVAILABLE',
    location: {
      name: 'Haflong Hill Ridge, Dima Hasao',
      coordinates: { lat: 25.1680, lng: 93.0180 },
    },
    contact: '+91-3673-236222 / DC Haflong',
    capacity: 800,
    currentOccupancy: 120,
    speedKmh: 0,
    elevationMeters: 750,
    isLandslideSafe: true,
    equipment: ['Solid Granitic Bedrock Ridge', 'Zero Debris Flow Path', 'Emergency Solar Generator', 'Helipad Access', 'Medical Camp'],
  },
  {
    resourceId: 'SHELTER-KHN-04',
    name: 'Khanapara Veterinary Highland Ridge Center',
    type: 'SHELTER',
    status: 'AVAILABLE',
    location: {
      name: 'Khanapara Campus Plateau, Guwahati',
      coordinates: { lat: 26.1250, lng: 91.8280 },
    },
    contact: '+91-361-2360145',
    capacity: 700,
    currentOccupancy: 180,
    speedKmh: 0,
    elevationMeters: 110,
    isLandslideSafe: true,
    equipment: ['Elevated Bedrock Formation', 'Direct Highway Access', 'RO Water Treatment Plant', 'Emergency Medical Ward'],
  },
  {
    resourceId: 'SHELTER-SILCHAR-05',
    name: 'Silchar Circuit House Highland Ridge Center',
    type: 'SHELTER',
    status: 'AVAILABLE',
    location: {
      name: 'Tarapur Highland Ridge, Silchar',
      coordinates: { lat: 24.8290, lng: 92.7950 },
    },
    contact: '+91-3842-233111',
    capacity: 650,
    currentOccupancy: 190,
    speedKmh: 0,
    elevationMeters: 65,
    isLandslideSafe: true,
    equipment: ['Elevated Flood Safe Mound', 'Emergency Rations Store', 'Doctor On Duty', 'High Capacity Generators'],
  },
  {
    resourceId: 'SHELTER-DARRANG-06',
    name: 'Mangaldai College Highland Flood Relief Center, Darrang',
    type: 'SHELTER',
    status: 'AVAILABLE',
    location: {
      name: 'Mangaldai Higher Ground Enclave, Darrang',
      coordinates: { lat: 26.4385, lng: 92.0340 },
    },
    contact: '+91-3713-222108',
    capacity: 1100,
    currentOccupancy: 240,
    speedKmh: 0,
    elevationMeters: 68,
    isLandslideSafe: true,
    equipment: ['Community Kitchen', 'Water Purification Units', 'Emergency Bedding', 'Medical Camp', 'Backup Diesel Generator'],
  },
];

// Helper to seed data and upsert rich driver and shelter info
async function ensureSeedData() {
  const count = await Resource.countDocuments();
  if (count === 0) {
    await Resource.insertMany(INITIAL_RESOURCES);
  } else {
    for (const resData of INITIAL_RESOURCES) {
      await Resource.updateOne(
        { resourceId: resData.resourceId },
        { $set: resData },
        { upsert: true }
      );
    }
  }
}

// ==========================================
// 1. GET ALL RESOURCES (WITH PROXIMITY SORTING)
// ==========================================
router.get('/', async (req, res) => {
  try {
    await ensureSeedData();
    const { lat, lng, type, status } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const resources = await Resource.find(filter).lean();

    if (lat && lng) {
      const qLat = parseFloat(lat as string);
      const qLng = parseFloat(lng as string);

      // Annotate each resource with distance and ETA
      const annotated = resources.map((r) => {
        const distKm = calculateDistanceKm(
          r.location.coordinates.lat,
          r.location.coordinates.lng,
          qLat,
          qLng
        );

        let etaMinutes = null;
        if (r.speedKmh > 0) {
          // Add 3 min dispatch preparation delay + road terrain coefficient (1.2)
          etaMinutes = Math.max(3, Math.round((distKm / r.speedKmh) * 60 * 1.2) + 3);
        }

        return {
          ...r,
          distanceKm: distKm,
          etaMinutes: r.etaMinutes || etaMinutes,
        };
      });

      // Sort by proximity
      annotated.sort((a, b) => a.distanceKm - b.distanceKm);

      // Summary categories for emergency dashboard
      const nearestAmbulance = annotated.find((r) => r.type === 'AMBULANCE' && r.status === 'AVAILABLE') || null;
      const nearestRescueTeam = annotated.find((r) => r.type === 'RESCUE_TEAM' && r.status === 'AVAILABLE') || null;
      const nearestHospital = annotated.find((r) => r.type === 'HOSPITAL') || null;
      const nearestShelter = annotated.find((r) => r.type === 'SHELTER') || null;
      const nearestLandslideShelter = annotated.find((r) => r.type === 'SHELTER' && r.isLandslideSafe) || nearestShelter;
      const nearestBoat = annotated.find((r) => r.type === 'RESCUE_BOAT' && r.status === 'AVAILABLE') || null;

      return res.json({
        total: annotated.length,
        queryLocation: { lat: qLat, lng: qLng },
        summary: {
          nearestAmbulance,
          nearestRescueTeam,
          nearestHospital,
          nearestShelter,
          nearestLandslideShelter,
          nearestBoat,
        },
        resources: annotated,
      });
    }

    res.json({ total: resources.length, resources });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. DISPATCH / DEPLOY RESOURCES TO AREA
// ==========================================
router.post('/deploy', async (req, res) => {
  try {
    await ensureSeedData();
    const { targetLat, targetLng, targetName, incidentId, resourceIds, deployAllNearby } = req.body;

    if (!targetLat || !targetLng) {
      return res.status(400).json({ error: 'Target coordinates (targetLat, targetLng) are required' });
    }

    const tLat = parseFloat(targetLat);
    const tLng = parseFloat(targetLng);
    const placeName = targetName || `Hazard Sector (${tLat.toFixed(4)}, ${tLng.toFixed(4)})`;

    let toDispatchIds: string[] = [];

    if (deployAllNearby) {
      // Find nearest available ambulance, rescue team, and boat
      const allAvailable = await Resource.find({ status: 'AVAILABLE' }).lean();

      const sorted = allAvailable.map((r) => ({
        ...r,
        dist: calculateDistanceKm(r.location.coordinates.lat, r.location.coordinates.lng, tLat, tLng),
      })).sort((a, b) => a.dist - b.dist);

      const amb = sorted.find((r) => r.type === 'AMBULANCE');
      const team = sorted.find((r) => r.type === 'RESCUE_TEAM');
      const boat = sorted.find((r) => r.type === 'RESCUE_BOAT');

      if (amb) toDispatchIds.push(amb.resourceId);
      if (team) toDispatchIds.push(team.resourceId);
      if (boat) toDispatchIds.push(boat.resourceId);
    } else if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
      toDispatchIds = resourceIds;
    } else {
      // Default: dispatch nearest ambulance and rescue team
      const nearest = await Resource.find({ type: { $in: ['AMBULANCE', 'RESCUE_TEAM'] }, status: 'AVAILABLE' }).lean();
      if (nearest.length > 0) {
        nearest.sort((a, b) => {
          const dA = calculateDistanceKm(a.location.coordinates.lat, a.location.coordinates.lng, tLat, tLng);
          const dB = calculateDistanceKm(b.location.coordinates.lat, b.location.coordinates.lng, tLat, tLng);
          return dA - dB;
        });
        toDispatchIds.push(nearest[0].resourceId);
        if (nearest.length > 1) toDispatchIds.push(nearest[1].resourceId);
      }
    }

    if (toDispatchIds.length === 0) {
      return res.status(404).json({ error: 'No available emergency resources found to dispatch.' });
    }

    // Update resources in database
    const dispatchedDocs = [];
    const dispatchRoutes = [];

    for (const rid of toDispatchIds) {
      const doc = await Resource.findOne({ resourceId: rid });
      if (doc) {
        const distKm = calculateDistanceKm(doc.location.coordinates.lat, doc.location.coordinates.lng, tLat, tLng);
        const eta = Math.max(4, Math.round((distKm / (doc.speedKmh || 45)) * 60 * 1.2) + 2);

        doc.status = 'DISPATCHED';
        doc.assignedIncident = incidentId || `INC-${Date.now().toString().slice(-6)}`;
        doc.assignedTarget = { lat: tLat, lng: tLng, name: placeName };
        doc.deployedAt = new Date();
        doc.etaMinutes = eta;
        await doc.save();

        const docJson = doc.toJSON();
        dispatchedDocs.push({
          ...docJson,
          distanceKm: distKm,
          etaMinutes: eta,
        });

        // Generate emergency transit route polyline
        const routePath = generateRoutePath(
          [doc.location.coordinates.lat, doc.location.coordinates.lng],
          [tLat, tLng],
          0.8
        );

        dispatchRoutes.push({
          resourceId: doc.resourceId,
          resourceName: doc.name,
          type: doc.type,
          origin: [doc.location.coordinates.lat, doc.location.coordinates.lng],
          destination: [tLat, tLng],
          distanceKm: distKm,
          etaMinutes: eta,
          coordinates: routePath,
        });
      }
    }

    res.json({
      success: true,
      message: `Successfully deployed ${dispatchedDocs.length} emergency unit(s) to ${placeName}.`,
      deployedCount: dispatchedDocs.length,
      target: { lat: tLat, lng: tLng, name: placeName },
      dispatchedUnits: dispatchedDocs,
      routes: dispatchRoutes,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. RECALL / RESET DISPATCHED UNITS
// ==========================================
router.post('/reset', async (req, res) => {
  try {
    await Resource.updateMany(
      { status: { $in: ['DISPATCHED', 'EN_ROUTE', 'BUSY'] } },
      {
        $set: {
          status: 'AVAILABLE',
          assignedIncident: null,
          assignedTarget: null,
          deployedAt: null,
          etaMinutes: null,
        },
      }
    );
    res.json({ success: true, message: 'All emergency units reset to AVAILABLE state.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. GET NEARBY EVACUATION & SAFE TRANSIT ROUTES
// ==========================================
router.get('/routes/nearby', async (req, res) => {
  try {
    await ensureSeedData();
    const { lat, lng, locationName } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Coordinates (lat, lng) are required' });
    }

    const qLat = parseFloat(lat as string);
    const qLng = parseFloat(lng as string);

    // Find nearest hospital and nearest shelter
    const hospitals = await Resource.find({ type: 'HOSPITAL' }).lean();
    const shelters = await Resource.find({ type: 'SHELTER' }).lean();

    hospitals.sort((a, b) =>
      calculateDistanceKm(a.location.coordinates.lat, a.location.coordinates.lng, qLat, qLng) -
      calculateDistanceKm(b.location.coordinates.lat, b.location.coordinates.lng, qLat, qLng)
    );

    shelters.sort((a, b) =>
      calculateDistanceKm(a.location.coordinates.lat, a.location.coordinates.lng, qLat, qLng) -
      calculateDistanceKm(b.location.coordinates.lat, b.location.coordinates.lng, qLat, qLng)
    );

    const nearestHosp = hospitals[0];
    const nearestShelter = shelters[0];

    // Primary safe route (to shelter or hospital)
    const safeDestination: [number, number] = nearestShelter
      ? [nearestShelter.location.coordinates.lat, nearestShelter.location.coordinates.lng]
      : [qLat + 0.04, qLng + 0.03];

    const hospitalDestination: [number, number] = nearestHosp
      ? [nearestHosp.location.coordinates.lat, nearestHosp.location.coordinates.lng]
      : [qLat - 0.03, qLng + 0.04];

    // Build routes
    const primarySafeRoute = generateRoutePath([qLat, qLng], safeDestination, 0.4);
    const hospitalRoute = generateRoutePath([qLat, qLng], hospitalDestination, 0.6);

    // Build a simulated compromised road through low-lying valley/river basin
    const compromisedRoute = generateRoutePath([qLat, qLng], [qLat + 0.025, qLng - 0.035], 1.2);

    const safeDistKm = nearestShelter
      ? calculateDistanceKm(qLat, qLng, nearestShelter.location.coordinates.lat, nearestShelter.location.coordinates.lng)
      : 4.2;

    const hospDistKm = nearestHosp
      ? calculateDistanceKm(qLat, qLng, nearestHosp.location.coordinates.lat, nearestHosp.location.coordinates.lng)
      : 5.8;

    // Dynamically calculate compromised road name and hazard reason based on location & coordinates
    let hazardRoadName = 'NH-27 Low-Lying Riverine Corridor (Waterlogging & Landslide Risk)';
    let hazardRoadReason = 'Inundation depth > 0.8m / Active debris flow sector';

    const locStr = (typeof locationName === 'string' ? locationName : '').toLowerCase();

    if (locStr.includes('paltan') || locStr.includes('nazma') || locStr.includes('gnb') || (Math.abs(qLat - 26.184) < 0.04 && Math.abs(qLng - 91.756) < 0.04)) {
      hazardRoadName = 'G.N.B Road & Paltan Bazar Underpass Corridor (Urban Waterlogging & Silt Inundation)';
      hazardRoadReason = 'Stormwater runoff depth > 0.65m / Low-lying railway underpass impassable';
    } else if (locStr.includes('byrnihat') || locStr.includes('umling') || locStr.includes('ri-bhoi') || (Math.abs(qLat - 26.039) < 0.05 && Math.abs(qLng - 91.794) < 0.05)) {
      hazardRoadName = 'GS Road Byrnihat Mountain Defile (Rockfall & Slope Failure Hazard)';
      hazardRoadReason = 'Active mudslide debris flow / Boulder slip blocking south carriageway';
    } else if (locStr.includes('jalukbari') || locStr.includes('maligaon') || (Math.abs(qLat - 26.15) < 0.03 && Math.abs(qLng - 91.68) < 0.04)) {
      hazardRoadName = 'Pandu-Jalukbari Foothill Arterial (Hillside Slope Cut Slip)';
      hazardRoadReason = 'Debris flow from Kamakhya hill slope onto carriage lane';
    } else if (qLat < 25.80) {
      hazardRoadName = 'SH-12 Balat-Ranikor Hill Artery (Severe Geotechnical Landslide Hazard)';
      hazardRoadReason = 'Deep-seated rotational slope failure / 1.1m road subsidence';
    } else if (qLng < 91.65) {
      hazardRoadName = 'NH-17 / Rani-Mirza Embankment Corridor (River Inundation Risk)';
      hazardRoadReason = 'Kulsi river overflow breached shoulder / Water depth > 0.75m';
    } else if (qLng > 91.85) {
      hazardRoadName = 'Chandrapur-Panikhaiti Riverbank Arterial (High River Scour Risk)';
      hazardRoadReason = 'Active riverbank erosion threatening 120m roadway subbase';
    } else if (locStr) {
      const cleanLoc = locStr.split(',')[0].replace(/\b\w/g, (c: string) => c.toUpperCase());
      hazardRoadName = `${cleanLoc} Low-Lying Sector Artery (Waterlogging & Landslide Risk)`;
      const depth = (0.6 + ((Math.abs(qLat * 100) % 40) / 100)).toFixed(2);
      hazardRoadReason = `Inundation depth > ${depth}m / Active debris flow sector`;
    }

    res.json({
      success: true,
      queryLocation: { lat: qLat, lng: qLng },
      routes: {
        primarySafe: {
          name: nearestShelter ? `Safe Evacuation Route to ${nearestShelter.name}` : 'Primary Highland Evacuation Route',
          status: 'CLEAR',
          type: 'SAFE_EVACUATION',
          distanceKm: safeDistKm,
          estimatedDurationMinutes: Math.round(safeDistKm * 2.2),
          coordinates: primarySafeRoute,
          targetShelter: nearestShelter,
        },
        hospitalRoute: {
          name: nearestHosp ? `Emergency Medical Transit to ${nearestHosp.name}` : 'Hospital Transit Route',
          status: 'CLEAR',
          type: 'MEDICAL_TRANSIT',
          distanceKm: hospDistKm,
          estimatedDurationMinutes: Math.round(hospDistKm * 1.8),
          coordinates: hospitalRoute,
          targetHospital: nearestHosp,
        },
        compromisedHazardRoad: {
          name: hazardRoadName,
          status: 'COMPROMISED',
          type: 'HAZARD_AVOID',
          hazardReason: hazardRoadReason,
          coordinates: compromisedRoute,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. GET HIGH-PRECISION SIMULATION ROUTE (ORS)
// ==========================================
router.get('/simulation-route', async (req, res) => {
  try {
    await ensureSeedData();
    const { resourceId, fromLat, fromLng, toLat, toLng, targetName } = req.query;

    let startLat = parseFloat(fromLat as string);
    let startLng = parseFloat(fromLng as string);
    let targetLatitude = parseFloat(toLat as string);
    let targetLongitude = parseFloat(toLng as string);

    let resourceDoc: any = null;
    if (resourceId) {
      resourceDoc = await Resource.findOne({ resourceId: String(resourceId) });
      if (resourceDoc && (isNaN(startLat) || isNaN(startLng))) {
        startLat = resourceDoc.location.coordinates.lat;
        startLng = resourceDoc.location.coordinates.lng;
      }
    }

    if (isNaN(startLat) || isNaN(startLng)) {
      startLat = 26.1450;
      startLng = 91.7920;
    }

    if (isNaN(targetLatitude) || isNaN(targetLongitude)) {
      targetLatitude = 26.2200;
      targetLongitude = 91.6450;
    }

    const orsKey =
      process.env.ORS_API_KEY ||
      'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjlkNDU5NTk5N2VmOTQwYWI4YzI2OWUxNjg3OTUyNjgyIiwiaCI6Im11cm11cjY0In0=';
    let waypoints: [number, number][] = [];
    let distanceKm = 0;
    let durationMin = 0;
    let turnSteps: string[] = [];
    let source = 'ORS_API';

    if (orsKey) {
      try {
        const orsUrl = 'https://api.openrouteservice.org/v2/directions/driving-car';
        const orsResp = await axios.get(orsUrl, {
          params: {
            api_key: orsKey,
            start: `${startLng},${startLat}`,
            end: `${targetLongitude},${targetLatitude}`,
            radiuses: '-1,-1',
          },
          timeout: 6000,
        });

        if (orsResp.status === 200 && orsResp.data?.features?.length > 0) {
          const feat = orsResp.data.features[0];
          const rawCoords = feat.geometry.coordinates; // [lng, lat]
          waypoints = rawCoords.map((c: [number, number]) => [c[1], c[0]]);
          const summary = feat.properties.summary;
          distanceKm = Math.round((summary.distance / 1000) * 10) / 10;
          durationMin = Math.round((summary.duration / 60) * 10) / 10;

          const segments = feat.properties.segments?.[0]?.steps || [];
          turnSteps = segments.map((s: any) => s.instruction || 'Follow road corridor').slice(0, 10);
        }
      } catch (orsErr: any) {
        console.warn('[ORS API Warning, falling back to curved spline]:', orsErr.message);
        source = 'FALLBACK_SPLINE';
      }
    }

    if (waypoints.length === 0) {
      waypoints = generateRoutePath([startLat, startLng], [targetLatitude, targetLongitude], 0.7);
      distanceKm = calculateDistanceKm(startLat, startLng, targetLatitude, targetLongitude);
      durationMin = Math.round((distanceKm / (resourceDoc?.speedKmh || 50)) * 60);
      turnSteps = [
        `Depart base: ${resourceDoc?.location?.name || 'Emergency Dispatch Post'}`,
        'Engage Emergency Lights & Sirens (Code 3 Transit)',
        'Navigate arterial high-ground flood corridor',
        `Arrive at: ${targetName || 'Disaster Incident Sector'}`,
      ];
    }

    res.json({
      success: true,
      resourceId: resourceId || resourceDoc?.resourceId || 'AMB-108-GHY01',
      resourceName: resourceDoc?.name || '108 ALS Trauma Ambulance',
      resourceType: resourceDoc?.type || 'AMBULANCE',
      speedKmh: resourceDoc?.speedKmh || 55,
      contact: resourceDoc?.contact || '108',
      equipment: resourceDoc?.equipment || ['Ventilator', 'ECG', 'Oxygen'],
      start: { lat: startLat, lng: startLng, name: resourceDoc?.location?.name || 'Origin Base' },
      target: { lat: targetLatitude, lng: targetLongitude, name: targetName || 'Target Emergency Sector' },
      distanceKm,
      durationMin,
      etaSeconds: Math.round(durationMin * 60),
      waypoints,
      turnSteps,
      source,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
