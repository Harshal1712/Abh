import cron from 'node-cron';
import axios from 'axios';
import { RiskEvent } from '../models/RiskEvent';
import { Alert } from '../models/Alert';

export const startRiskMonitor = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Starting continuous monitoring of low/moderate risk locations...');
    try {
      // Find events that were created in the last 7 days and are not yet SEVERE/CRITICAL
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const monitoredEvents = await RiskEvent.find({
        createdAt: { $gte: sevenDaysAgo },
        combinedRisk: { $in: ['LOW', 'MODERATE'] }
      });

      console.log(`[CRON] Monitoring ${monitoredEvents.length} locations for trend escalation.`);

      for (const event of monitoredEvents) {
        try {
          // Ping the Python ML service for the latest dynamic prediction
          const res = await axios.get(`http://127.0.0.1:8000/risk?latitude=${event.coordinates.lat}&longitude=${event.coordinates.lng}`);
          const data = res.data;
          
          if (!data || !data.risk_class) continue;

          const newRiskClass = data.risk_class.toUpperCase();
          const oldRiskClass = event.combinedRisk.toUpperCase();

          // Check if trend escalated to HIGH or SEVERE
          if ((newRiskClass === 'HIGH' || newRiskClass === 'SEVERE' || newRiskClass === 'VERY HIGH') && (oldRiskClass === 'LOW' || oldRiskClass === 'MODERATE')) {
            console.log(`[CRON] Escalation detected at ${event.locationName}! ${oldRiskClass} -> ${newRiskClass}`);
            
            // Update the event
            event.combinedRisk = newRiskClass === 'VERY HIGH' ? 'SEVERE' : newRiskClass;
            event.dynamicLandslideRisk = data.risk.current;
            event.rainfall24h = data.rainfall['24h_mm'];
            event.forecastRainfall = data.forecast;
            event.status = 'PENDING_REVIEW'; // Push it back to expert review!
            
            // Generate an automatic alert notification
            const newAlert = new Alert({
              title: `TREND ESCALATION: ${event.locationName}`,
              message: `Risk has escalated from ${oldRiskClass} to ${newRiskClass} due to changing weather conditions (Forecast: ${data.forecast['24h_mm']}mm rain). Expert review required immediately.`,
              severity: event.combinedRisk,
              source: 'Continuous Monitoring System',
              status: 'PENDING_PUBLISH',
              matchedRiskEventId: event._id
            });
            
            await event.save();
            await newAlert.save();
            
            // TODO: Emit WebSocket event to frontend to notify connected users
            console.log(`[CRON] Alert created for ${event.locationName}`);
          }
        } catch (mlError: any) {
          console.error(`[CRON] Failed to check risk for ${event.locationName}:`, mlError.message);
        }
      }
    } catch (error: any) {
      console.error('[CRON] Error in risk monitor cron job:', error.message);
    }
  });
  console.log('Continuous Monitoring Cron Job scheduled (Hourly).');
};
