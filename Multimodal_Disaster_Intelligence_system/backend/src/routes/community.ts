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

import fs from 'fs';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage });

// Single image upload endpoint (Cloudinary with local server fallback)
router.post('/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  let finalUrl = `/uploads/${req.file.filename}`;

  // Attempt Cloudinary upload if configured
  if (
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET
  ) {
    try {
      const cRes = await cloudinary.uploader.upload(req.file.path, {
        folder: 'disaster_reports',
        resource_type: 'image',
      });
      if (cRes && cRes.secure_url) {
        finalUrl = cRes.secure_url;
      }
    } catch (cErr: any) {
      console.warn('Cloudinary upload fallback to local static CDN:', cErr?.message || cErr);
    }
  }

  res.json({ success: true, url: finalUrl });
});

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

    let imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    if (
      req.file &&
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        const cRes = await cloudinary.uploader.upload(req.file.path, {
          folder: 'disaster_reports',
          resource_type: 'image',
        });
        if (cRes && cRes.secure_url) {
          imageUrl = cRes.secure_url;
        }
      } catch (cErr: any) {
        console.warn('Cloudinary upload fallback to local static CDN:', cErr?.message || cErr);
      }
    }

    const report = new CommunityReport({
      locationName,
      coordinates: parsedCoords,
      reportType,
      description,
      reporterPhone,
      matchedRiskEventId: matchedRiskEventId || undefined,
      imageUrl,
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
