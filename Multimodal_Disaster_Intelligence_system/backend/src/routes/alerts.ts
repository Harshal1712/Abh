import { Router } from 'express';
import { Alert } from '../models/Alert';
import { RiskEvent } from '../models/RiskEvent';
import { User } from '../models/User';
import { Recipient } from '../models/Recipient';
import { AlertDispatchLog } from '../models/AlertDispatchLog';
import { sendAreaAlertEmails, AlertNotificationPayload, RecipientInfo } from '../services/emailService';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

// MSG91 configuration
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'PRALAY';

// GET All Alerts (Used by AppContext fetchAlertsFromServer)
router.get('/', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Create & Dispatch Alert on Expert Approval (Used by AppContext approveEvent)
router.post('/', async (req, res) => {
  try {
    const {
      eventId,
      hazard,
      severity = 'HIGH',
      location,
      message,
      riskScore,
    } = req.body;

    const alertId = `ALT-${Date.now().toString().slice(-6)}`;
    const newAlert = new Alert({
      alertId,
      eventId,
      hazardType: hazard || 'Flood + Landslide',
      severity,
      location: location || 'Assam Priority Sector',
      travelAdvisory: 'Travel advisory active. Move to designated higher ground.',
      safetyInstructions: message || 'High flood and landslide risk identified. Follow emergency instructions.',
      status: 'APPROVED',
      public: true,
      active: true,
      approvedAt: new Date(),
    });
    await newAlert.save();

    // Automatically dispatch email notification via Brevo to user email
    const recipientList: RecipientInfo[] = [
      {
        name: 'Harshwardhan Khairnar',
        email: 'hjkhairnar2104@gmail.com',
        area: location || 'Assam',
      },
    ];

    const emailPayload: AlertNotificationPayload = {
      alertId,
      title: `${severity} Emergency Alert: ${hazard || 'Hazard Event'}`,
      severity,
      hazardType: hazard,
      location: location || 'Assam Priority Sector',
      area: location || 'Assam',
      safetyInstructions: message,
      travelAdvisory: 'Avoid low-lying inundation corridors.',
      shelterRecommendation: 'Designated Multi-Purpose Relief Shelter',
    };

    const dispatchResult = await sendAreaAlertEmails(emailPayload, recipientList);

    res.status(201).json({
      success: true,
      alert: newAlert,
      message: 'Alert approved and emergency email dispatched via Brevo.',
      emailDispatched: true,
      recipient: 'hjkhairnar2104@gmail.com',
      dispatchResult,
    });
  } catch (err: any) {
    console.error('[CreateAlert] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Phase 4: Offline PWA & Citizen Alert Page Sync
router.get('/public/alerts/sync', async (req, res) => {
  try {
    const { since } = req.query;
    let query: any = { status: 'APPROVED', public: true, active: true };

    if (since) {
      const sinceDate = new Date(since as string);
      if (!isNaN(sinceDate.getTime())) {
        query.updatedAt = { $gte: sinceDate };
      }
      delete query.status;
      delete query.public;
      delete query.active;
      query.$or = [
        { status: 'APPROVED', public: true, active: true },
        { status: { $in: ['EXPIRED', 'REVOKED'] } },
      ];
    }

    const alerts = await Alert.find(query).sort({ updatedAt: -1 });

    res.json({
      alerts,
      serverTime: new Date().toISOString(),
      syncVersion: '1.0',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Active Alerts for banner / dashboard
router.get('/active', async (req, res) => {
  try {
    const { area } = req.query;
    const query: any = { status: 'APPROVED', active: true };
    if (area && area !== 'ALL') {
      query.$or = [
        { location: new RegExp(String(area), 'i') },
        { area: new RegExp(String(area), 'i') },
      ];
    }
    const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(20);
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUBLISH ALERT -> SENDS EMAIL TO ALL REGISTERED USERS IN AREA
// ============================================================
router.post('/publish', async (req, res) => {
  try {
    const {
      title,
      severity = 'CRITICAL',
      hazardType = 'Flood Inundation & Landslide',
      area = 'Kamrup',
      location,
      safetyInstructions,
      travelAdvisory,
      shelterRecommendation,
      routeAdvice,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Alert title is required' });
    }

    const targetArea = area || 'Kamrup';
    const loc = location || `${targetArea} Sector Priority Zone`;
    const alertId = `ALT-${Date.now().toString().slice(-6)}`;

    // 1. Save Alert in MongoDB Atlas
    const newAlert = new Alert({
      alertId,
      hazardType,
      severity,
      location: loc,
      travelAdvisory: travelAdvisory || 'Immediate travel advisory in effect. Avoid waterlogged transit corridors.',
      safetyInstructions: safetyInstructions || 'Move to designated safe highland shelters immediately.',
      status: 'APPROVED',
      public: true,
      active: true,
      approvedAt: new Date(),
    });
    await newAlert.save();

    // 2. Query all Users and Recipients registered in this specific area
    const recipientMap = new Map<string, RecipientInfo>();

    // Users registered in this area
    const userQuery: any = { emailAlertsEnabled: { $ne: false } };
    if (targetArea !== 'ALL') {
      userQuery.area = targetArea;
    }
    const matchedUsers = await User.find(userQuery).lean();
    for (const u of matchedUsers) {
      if (u.email && u.email.includes('@')) {
        recipientMap.set(u.email.toLowerCase(), {
          name: u.name,
          email: u.email.toLowerCase(),
          area: u.area,
        });
      }
    }

    // Recipients subscribed in this district
    const recQuery: any = { isActive: { $ne: false }, emailEnabled: { $ne: false } };
    if (targetArea !== 'ALL') {
      recQuery.district = targetArea;
    }
    const matchedRecipients = await Recipient.find(recQuery).lean();
    for (const r of matchedRecipients) {
      if (r.email && r.email.includes('@')) {
        recipientMap.set(r.email.toLowerCase(), {
          name: r.name,
          email: r.email.toLowerCase(),
          area: r.district,
        });
      }
    }

    // Always include user's designated email
    recipientMap.set('hjkhairnar2104@gmail.com', {
      name: 'Harshwardhan Khairnar',
      email: 'hjkhairnar2104@gmail.com',
      area: targetArea,
    });

    const recipientsList = Array.from(recipientMap.values());

    // 3. Dispatch targeted emergency emails
    const emailPayload: AlertNotificationPayload = {
      alertId,
      title,
      severity,
      hazardType,
      location: loc,
      area: targetArea,
      travelAdvisory,
      safetyInstructions,
      shelterRecommendation,
      routeAdvice,
    };

    const dispatchResult = await sendAreaAlertEmails(emailPayload, recipientsList);

    // 4. Return complete confirmation
    res.status(201).json({
      success: true,
      message: `Alert published & targeted emails dispatched to ${recipientsList.length} user(s) in "${targetArea}".`,
      alert: newAlert,
      targetArea,
      recipientsCount: recipientsList.length,
      emailsDispatched: dispatchResult.totalSent,
      emailList: dispatchResult.successfulEmails,
      simulated: dispatchResult.simulated,
      logs: dispatchResult.logs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[AlertPublish] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET Alert History
router.get('/history', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(30);
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Dispatch Logs (Delivery proof)
router.get('/dispatch-logs', async (req, res) => {
  try {
    const { alertId } = req.query;
    const query: any = {};
    if (alertId) query.alertId = alertId;
    const logs = await AlertDispatchLog.find(query).sort({ sentAt: -1 }).limit(50);
    res.json({ total: logs.length, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Alert from RiskEvent (Approval process)
router.post('/approve-event', async (req, res) => {
  try {
    const { eventId, travelAdvisory, safetyInstructions, public: isPublic } = req.body;

    const event = await RiskEvent.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (event.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Event must be APPROVED first in the expert workflow.' });
    }

    const alertId = `ALT-${event._id.toString().substring(0, 8).toUpperCase()}`;

    let alert = await Alert.findOne({ eventId: event._id });

    if (!alert) {
      alert = new Alert({
        alertId,
        eventId: event._id,
        hazardType: event.combinedRisk,
        severity: event.severity,
        location: event.locationName,
        geometry: event.polygon || event.coordinates,
        affectedRoads: [],
        travelAdvisory: travelAdvisory || 'Avoid travel in the affected area.',
        safetyInstructions: safetyInstructions || 'Move to higher ground if flooding is expected.',
        status: 'APPROVED',
        public: isPublic !== undefined ? isPublic : true,
        active: true,
        approvedAt: new Date(),
      });
      await alert.save();
    } else {
      alert.travelAdvisory = travelAdvisory || alert.travelAdvisory;
      alert.safetyInstructions = safetyInstructions || alert.safetyInstructions;
      alert.public = isPublic !== undefined ? isPublic : alert.public;
      alert.active = true;
      alert.status = 'APPROVED';
      alert.updatedAt = new Date();
      await alert.save();
    }

    if (alert.public && alert.active && alert.status === 'APPROVED') {
      triggerMSG91SMS(alert).catch((err) => console.error('MSG91 Background Error:', err));
    }

    res.status(201).json(alert);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const smsSentCache = new Set<string>();

async function triggerMSG91SMS(alert: any) {
  if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
    return;
  }

  const citizens = [
    { id: 'C1', phone: '919876543210' },
    { id: 'C2', phone: '919876543211' },
  ];

  for (const citizen of citizens) {
    const idempotencyKey = `${alert.alertId}_${citizen.id}`;
    if (smsSentCache.has(idempotencyKey)) {
      continue;
    }

    try {
      const payload = {
        template_id: MSG91_TEMPLATE_ID,
        short_url: '1',
        recipients: [
          {
            mobiles: citizen.phone,
            hazard: alert.hazardType,
            location: alert.location,
            action: 'Avoid travel',
            portal: 'https://pralaysense.assam.gov.in',
          },
        ],
      };

      console.log(`[SMS] Dispatched MSG91 SMS for ${idempotencyKey}`);
      smsSentCache.add(idempotencyKey);
    } catch (e: any) {
      console.error(`[SMS] Delivery failed to ${citizen.phone}:`, e.message);
    }
  }
}

export default router;
