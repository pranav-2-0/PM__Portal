import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pmRoutes from './routes/pmRoutes';
import authRoutes from './routes/authRoutes';   // ✅ ADD THIS
import { errorHandler } from './middleware/errorHandler';
import { schedulerService } from './services/schedulerService';
import { ensureExportIndexes } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ✅ REGISTER AUTH ROUTES
app.use('/api/auth', authRoutes);

// ✅ EXISTING PM ROUTES
app.use('/api/pm', pmRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  ensureExportIndexes();

  console.log('Starting workflow automation scheduler...');
  schedulerService.start();
  console.log('Scheduler started successfully');
});

export default app;