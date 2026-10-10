import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { connectDB } from './config/db';
import { startRiskMonitor } from './cron/riskMonitor';

const app = express();
const PORT = process.env.PORT || 5000;

import riskRoutes from './routes/risk';
import impactRoutes from './routes/impact';
import expertRoutes from './routes/expert';
import communityRoutes from './routes/community';
import alertsRoutes from './routes/alerts';
import recipientsRoutes from './routes/recipients';
import resourcesRoutes from './routes/resources';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/risk', riskRoutes);
app.use('/api/impact', impactRoutes);
app.use('/api/routes', impactRoutes);
app.use('/api/expert', expertRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/recipients', recipientsRoutes);
app.use('/api/resources', resourcesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running successfully.' });
});

// Connect to database and start server
connectDB().then(() => {
  startRiskMonitor(); // Start the background monitoring jobs
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
