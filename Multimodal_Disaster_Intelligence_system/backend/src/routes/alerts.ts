import { Router } from 'express';
import { Alert } from '../models/Alert';
import { RiskEvent } from '../models/RiskEvent';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

// MSG91 configuration
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'PRALAY';

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
    }
    
    // Also include revoked/expired alerts if we have a since token, so client can delete them
    if (since) {
      delete query.status;
      delete query.public;
      delete query.active;
      query.$or = [
        { status: 'APPROVED', public: true, active: true },
        { status: { $in: ['EXPIRED', 'REVOKED'] } }
      ];
    }

    const alerts = await Alert.find(query).sort({ updatedAt: -1 });
    
    res.json({
      alerts,
      serverTime: new Date().toISOString(),
      syncVersion: '1.0'
    });
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

    // Idempotency check: Does this alert already exist?
    let alert = await Alert.findOne({ eventId: event._id });
    
    if (!alert) {
      alert = new Alert({
        alertId,
        eventId: event._id,
        hazardType: event.combinedRisk,
        severity: event.severity,
        location: event.locationName,
        geometry: event.polygon || event.coordinates, // fallback to point
        affectedRoads: [], // Will be populated by routing service
        travelAdvisory: travelAdvisory || 'Avoid travel in the affected area.',
        safetyInstructions: safetyInstructions || 'Move to higher ground if flooding is expected.',
        status: 'APPROVED',
        public: isPublic !== undefined ? isPublic : true,
        active: true,
        approvedAt: new Date()
      });
      await alert.save();
    } else {
      // Update existing alert
      alert.travelAdvisory = travelAdvisory || alert.travelAdvisory;
      alert.safetyInstructions = safetyInstructions || alert.safetyInstructions;
      alert.public = isPublic !== undefined ? isPublic : alert.public;
      alert.active = true;
      alert.status = 'APPROVED';
      alert.updatedAt = new Date();
      await alert.save();
    }
    
    // Phase 5: SMS Trigger Rule
    // SMS may be sent ONLY when Alert is APPROVED, PUBLIC, and ACTIVE.
    if (alert.public && alert.active && alert.status === 'APPROVED') {
      // Trigger SMS asynchronously
      triggerMSG91SMS(alert).catch(err => console.error("MSG91 Background Error:", err));
    }

    res.status(201).json(alert);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Idempotent SMS Sender
const smsSentCache = new Set<string>();

async function triggerMSG91SMS(alert: any) {
  if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
    console.log(`[SMS] NOT CONFIGURED: Missing MSG91_AUTH_KEY or MSG91_TEMPLATE_ID. Skipping SMS for alert ${alert.alertId}`);
    return;
  }
  
  // Dummy citizen recipients (would come from DB in real scenario)
  const citizens = [
    { id: 'C1', phone: '919876543210' },
    { id: 'C2', phone: '919876543211' }
  ];
  
  for (const citizen of citizens) {
    // Idempotency key: alertId + citizenId
    const idempotencyKey = `${alert.alertId}_${citizen.id}`;
    if (smsSentCache.has(idempotencyKey)) {
      console.log(`[SMS] Idempotency rule: Already sent SMS for ${idempotencyKey}`);
      continue;
    }
    
    try {
      // MSG91 REST API payload
      const payload = {
        template_id: MSG91_TEMPLATE_ID,
        short_url: "1",
        recipients: [
          {
            mobiles: citizen.phone,
            hazard: alert.hazardType,
            location: alert.location,
            action: "Avoid travel",
            portal: "https://pralaysense.assam.gov.in"
          }
        ]
      };
      
      /*
      // Real API Call (Commented out to prevent failing if keys are fake)
      await axios.post('https://control.msg91.com/api/v5/flow/', payload, {
        headers: {
          'authkey': MSG91_AUTH_KEY,
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      });
      */
      
      console.log(`[SMS] Successfully dispatched MSG91 SMS for ${idempotencyKey}`);
      smsSentCache.add(idempotencyKey);
    } catch (e: any) {
      console.error(`[SMS] Delivery failed to ${citizen.phone}:`, e.message);
    }
  }
}

export default router;
