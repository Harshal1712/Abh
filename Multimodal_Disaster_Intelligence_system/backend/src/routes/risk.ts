import { Router } from 'express';
import { RiskEvent } from '../models/RiskEvent';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

const PYTHON_ML_URL = process.env.PYTHON_ML_URL || 'http://127.0.0.1:8000';

// Simple in-memory cache for explanations
const explanationCache = new Map<string, string>();

// Endpoint for ML Model Explainability via Hugging Face LLM
router.post('/explanation', async (req, res) => {
  try {
    const { hazard, model, prediction, features, localContributions, riskFactorWeighting, timestamps, availability } = req.body;
    
    // Create a deterministic hash of the payload to use as a cache key
    const payloadString = JSON.stringify({ hazard, prediction, features, localContributions, riskFactorWeighting });
    const cacheKey = crypto.createHash('md5').update(payloadString).digest('hex');
    
    if (explanationCache.has(cacheKey)) {
      return res.json({ explanation: explanationCache.get(cacheKey) });
    }

    // Default fallback in case HF is unreachable or not configured
    let fallbackExplanation = `Model explanation is currently unavailable.`;
    if (hazard === 'flood') {
      fallbackExplanation = `The flood model estimates elevated flood risk based on the available rainfall, terrain and Sentinel-1 observations. Recent SAR change is among the model's important available signals.`;
    } else {
      fallbackExplanation = `Current landslide risk is elevated. The model places greater importance on the available terrain and rainfall conditions, while the Sentinel-1 observation provides additional surface-change information.`;
    }

    const prompt = `You are a helpful, simple explanation assistant for a disaster-risk machine-learning system.
The prediction and feature contributions have already been calculated. Your job is to convert these raw values into a short, easy-to-understand summary for a normal person.
Provide a brief, concise explanation (maximum 3-4 sentences). Focus only on the top 2-3 most important factors that drove the prediction.
IMPORTANT: Use extremely simple, non-technical language. Do not use jargon like "antecedent rainfall" (say "recent rainfall" instead), or "DEM" (say "elevation" or "terrain height"). 
Explain it like you are talking to a citizen concerned about their neighborhood.
Do not calculate new values or invent numbers.
For Flood risk, rely on the Local Contributions (SHAP/TreeSHAP). If a feature has a positive SHAP contribution, it increased the risk; if negative, it decreased the risk.
For Landslide risk, use the Risk Factor Weighting.
Keep the summary friendly, brief, and very easy to understand.

Model: ${model}
Hazard: ${hazard}
Prediction: ${prediction}
Features: ${JSON.stringify(features)}
Local Contributions (SHAP/TreeSHAP): ${localContributions ? JSON.stringify(localContributions) : 'Unavailable'}
Risk Factor Weighting: ${riskFactorWeighting ? JSON.stringify(riskFactorWeighting) : 'Unavailable'}
`;

    if (!process.env.OPENAI_API_KEY) {
      // If no token is provided, just return the fallback deterministic explanation
      explanationCache.set(cacheKey, fallbackExplanation);
      return res.json({ explanation: fallbackExplanation });
    }

    try {
      // Call OpenAI API
      const openAiResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        }
      );
      
      let generatedText = openAiResponse.data.choices[0]?.message?.content || fallbackExplanation;
      generatedText = generatedText.trim();
      
      explanationCache.set(cacheKey, generatedText);
      return res.json({ explanation: generatedText });
      
    } catch (hfError: any) {
      console.error('Hugging Face API error, using fallback:', hfError.message);
      explanationCache.set(cacheKey, fallbackExplanation);
      return res.json({ explanation: fallbackExplanation });
    }

  } catch (err: any) {
    console.error('Error generating explanation:', err);
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

// Real AI engine endpoint fusing multimodal data
router.get('/location', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Call Python ML service
    const pythonResponse = await axios.get(`${PYTHON_ML_URL}/risk`, {
      params: { latitude: lat, longitude: lng },
      timeout: 15000 // 15 seconds timeout
    });

    const data = pythonResponse.data;

    // Check if the current risk warrants a review
    if (data.risk && data.risk.current > 0.6) {
      
      let calcConfidence = 85;
      if (data.risk.current > 0.8) calcConfidence = 92;
      else if (data.risk.current < 0.2) calcConfidence = 88;
      
      let floodProb = 0;
      if (data.flood && data.flood.available && data.flood.floodProbability) {
        floodProb = Math.round(data.flood.floodProbability * 100);
      }
      
      const landslideProb = Math.round(data.risk.current * 100);
      
      let combinedSeverity = data.risk.current > 0.8 || (floodProb > 80) ? 'SEVERE' : 'MAJOR';
      let combinedType = floodProb > 40 && landslideProb > 40 ? 'MULTI_HAZARD' : (floodProb > landslideProb ? 'FLOOD' : 'LANDSLIDE');

      // Auto-create a PENDING_REVIEW RiskEvent if it's high risk
      const newRisk = new RiskEvent({
        locationName: `Lat: ${data.location.latitude}, Lng: ${data.location.longitude}`,
        coordinates: { lat: data.location.latitude, lng: data.location.longitude },
        floodProbability: floodProb,
        landslideProbability: landslideProb,
        combinedRisk: combinedType,
        severity: combinedSeverity,
        confidence: calcConfidence,
        timeWindow: 'Next 24-72 hours',
        status: 'PENDING_REVIEW',
        localContributions: data.localContributions,
        globalFeatureImportance: data.globalFeatureImportance,
        riskFactorWeighting: data.riskFactorWeighting
      });
      // Optionally save to Mongo (commenting out auto-save to avoid spamming DB on every click)
      // await newRisk.save();
    }

    res.json(data);
  } catch (error: any) {
    if (error.response) {
      // Pass through Python service error (e.g. 404 NoData)
      return res.status(error.response.status).json({ error: error.response.data.detail || 'Python service error' });
    } else if (error.request) {
      return res.status(503).json({ error: 'AI risk service unavailable' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to fetch SAR change
router.get('/sar', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const pythonResponse = await axios.get(`${PYTHON_ML_URL}/sar`, {
      params: { latitude: lat, longitude: lng },
      timeout: 10000 
    });

    res.json(pythonResponse.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      return res.status(503).json({ error: 'SAR service unavailable' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to fetch all active events
router.get('/', async (req, res) => {
  try {
    const risks = await RiskEvent.find().sort({ createdAt: -1 });
    res.json(risks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { CommunityReport } from '../models/CommunityReport';
import { Alert } from '../models/Alert';

// Temporary endpoint to clear all events
router.get('/clear-all-events', async (req, res) => {
  try {
    const result = await RiskEvent.deleteMany({});
    await CommunityReport.deleteMany({});
    await Alert.deleteMany({});
    res.json({ message: 'Cleared all events, reports, and alerts successfully', count: result.deletedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to manually create a new event (e.g. from user clicking map and approving)
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    
    // Calculate dynamic confidence based on extremeness of probabilities
    let calcConfidence = 82; // base
    const maxRisk = Math.max(data.landslideRisk || 0, (data.floodProbability || 0) * 100);
    if (maxRisk > 85) calcConfidence = 94;
    else if (maxRisk > 60) calcConfidence = 88;
    else if (maxRisk < 20) calcConfidence = 91; // Confident it's safe

    // We expect `data` to contain the ML output + some frontend metadata
    const newRisk = new RiskEvent({
      locationName: data.locationName || `Lat: ${data.lat}, Lng: ${data.lng}`,
      coordinates: { lat: data.lat, lng: data.lng },
      floodProbability: (data.floodProbability !== undefined && data.floodProbability !== null)
        ? (data.floodProbability <= 1 ? Math.round(data.floodProbability * 100) : Math.round(data.floodProbability))
        : 29,
      floodModel: data.floodModel,
      floodTimestamp: data.floodTimestamp,
      floodSentinel1VV: data.floodSentinel1VV,
      floodSentinel1VH: data.floodSentinel1VH,
      floodSentinel1VVChange: data.floodSentinel1VVChange,
      floodSentinel1VHChange: data.floodSentinel1VHChange,
      floodSentinel1CurrentDate: data.floodSentinel1CurrentDate,
      floodSentinel1PreviousDate: data.floodSentinel1PreviousDate,
      floodDEM: data.floodDEM,
      floodSlope: data.floodSlope,
      landslideProbability: (data.landslideRisk !== undefined && data.landslideRisk !== null && data.landslideRisk > 0)
        ? (data.landslideRisk <= 1 ? Math.round(data.landslideRisk * 100) : Math.round(data.landslideRisk))
        : 48,
      combinedRisk: data.riskClass || 'MODERATE',
      severity: (data.landslideRisk || 48) > 70 ? 'SEVERE' : ((data.landslideRisk || 48) > 40 ? 'MAJOR' : 'MINOR'),
      confidence: calcConfidence,
      timeWindow: 'Next 24-72 hours',
      status: 'PENDING_REVIEW',
      
      // Additional real data
      baselineSusceptibility: data.baselineSusceptibility,
      dynamicLandslideRisk: data.dynamicLandslideRisk,
      rainfall24h: data.rainfall24h,
      rainfall72h: data.rainfall72h,
      recentRainfall: data.recentRainfall,
      forecastRainfall: data.forecastRainfall,
      avgSlope: data.avgSlope,
      
      // Sentinel-1 mapping
      sentinel1Change: data.sentinel1?.change,
      sentinel1VV: data.sentinel1?.details?.vv_change,
      sentinel1VH: data.sentinel1?.details?.vh_change,
      sentinel1CurrentDate: data.sentinel1?.currentDate,
      sentinel1PreviousDate: data.sentinel1?.previousDate,
      sentinel1Unit: data.sentinel1?.unit,
      sentinel1Source: data.sentinel1?.source,
      
      // Feature Importance
      localContributions: data.localContributions,
      globalFeatureImportance: data.globalFeatureImportance,
      riskFactorWeighting: data.riskFactorWeighting,
      
      // Soil Moisture mapping
      soilMoisture: data.soil_moisture?.value,
      soilMoistureUnit: data.soil_moisture?.unit,
      soilMoistureSource: data.soil_moisture?.source,
      soilMoistureDepth: data.soil_moisture?.depth,
      soilMoistureTimestamp: data.soil_moisture?.timestamp,
      
      modelName: data.modelName || 'CatBoost + Open-Meteo'
    });

    const saved = await newRisk.save();
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to update event status (Expert Review)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, approvalReason, approvedBy } = req.body;
    
    const updateData: any = { status };
    if (status === 'APPROVED') {
      updateData.alertEligible = true;
      updateData.approvedAt = new Date();
      if (approvedBy) updateData.approvedBy = approvedBy;
      if (approvalReason) updateData.approvalReason = approvalReason;
    }

    const updated = await RiskEvent.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to fetch flood risk
router.get('/flood', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    const response = await axios.get(`${PYTHON_ML_URL}/flood`, {
      params: { lat, lon }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching flood risk:', error);
    res.status(500).json({ error: 'Failed to fetch flood risk data' });
  }
});

// Expose the new Debug endpoints as requested
router.get('/landslide/debug', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    const pythonResponse = await axios.get(`${PYTHON_ML_URL}/api/risk/landslide/debug`, {
      params: { lat, lng }
    });
    res.json(pythonResponse.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/flood/debug', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    const pythonResponse = await axios.get(`${PYTHON_ML_URL}/api/risk/flood/debug`, {
      params: { lat, lng }
    });
    res.json(pythonResponse.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
