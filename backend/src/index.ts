import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import syncRoutes from './routes/sync';
import statsRoutes from './routes/stats';
import { authMiddleware } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/sync', authMiddleware, syncRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);

app.listen(PORT, () => {
  console.log(`Health Tracker API running on port ${PORT}`);
});
