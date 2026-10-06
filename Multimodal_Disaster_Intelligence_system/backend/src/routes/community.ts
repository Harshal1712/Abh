import { Router } from 'express';
import { CommunityReport } from '../models/CommunityReport';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import path from 'path';

const router = Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET_KEY
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'disaster_reports',
      format: 'jpg',
      public_id: Date.now() + '-' + Math.round(Math.random() * 1E9),
    };
  }
});
const upload = multer({ storage: storage });

// Submit a new community report
router.post('/report', upload.single('image'), async (req, res) => {
  try {
    const { locationName, coordinates, reportType, description, reporterPhone, matchedRiskEventId } = req.body;
    let parsedCoords = coordinates;
    
    // Multer formData sends coordinates as string
    if (typeof coordinates === 'string') {
      try {
        parsedCoords = JSON.parse(coordinates);
      } catch (e) {
        // Fallback or ignore
      }
    }

    const report = new CommunityReport({
      locationName,
      coordinates: parsedCoords,
      reportType,
      description,
      reporterPhone,
      matchedRiskEventId: matchedRiskEventId || undefined,
      imageUrl: req.file ? req.file.path : undefined,
      status: 'PENDING_VALIDATION'
    });

    await report.save();
    res.status(201).json({ message: 'Community report submitted for validation', data: report });
  } catch (error: any) {
    console.error("Error saving report:", error);
    res.status(500).json({ error: error.message });
  }
});

// Verify a community report (expert/admin action)
router.put('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'VERIFIED' or 'REJECTED'

    const report = await CommunityReport.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: `Report marked as ${status}`, data: report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const reports = await CommunityReport.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { sendEmailAlert } from '../services/emailService';
import { sendWhatsAppAlert } from '../services/twilioWhatsApp';

// Dispatch demo alert for a community report
router.post('/demo-dispatch', async (req, res) => {
  try {
    const { hazardType, location, message, emailTo, whatsappTo } = req.body;
    
    const targetEmail = emailTo || process.env.TEST_EMAIL_TO;
    const targetWhatsApp = whatsappTo || process.env.TEST_WHATSAPP_TO;
    
    let emailRes, waRes;
    
    if (targetEmail) {
      emailRes = await sendEmailAlert({
        to: targetEmail,
        subject: `[PRALAY-SENSE] Verified ${hazardType} Alert in ${location}`,
        text: `Community report verified by PRALAY-SENSE expert.\n\nLocation: ${location}\nHazard: ${hazardType}\n\nMessage: ${message}\n\nPlease take necessary precautions.`
      });
    }
    
    if (targetWhatsApp) {
      waRes = await sendWhatsAppAlert(targetWhatsApp, `*[PRALAY-SENSE] Verified ${hazardType} Alert*\n\nLocation: ${location}\n\nMessage: ${message}\n\nPlease take necessary precautions.`);
    }
    
    res.json({ success: true, email: emailRes, whatsapp: waRes });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
