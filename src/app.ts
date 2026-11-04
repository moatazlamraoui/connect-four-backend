import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import gameRoutes from './routes/games.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import statsRoutes from './routes/stats.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'connect-four-backend' }));
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
