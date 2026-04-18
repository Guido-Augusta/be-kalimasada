import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from "path";

import ustadzRoutes from './routes/ustadzRoutes';
import seedRoutes from './routes/seedRoute';
import authRoutes from './routes/authRoutes';
import ortuRoutes from './routes/ortuRoutes';
import santriRoutes from './routes/santriRoutes';
import chartRoutes from './routes/chartRoutes';
import alquranRoutes from './routes/alquranRoutes';
import hafalanRoutes from './routes/hafalanRoutes';
import './cron/peringkatCron';
import './cron/emailCron';

dotenv.config();
const app = express();

app.use(cors({
  origin: '*',
}));
app.use(express.json());

app.use("/public", express.static(path.join(__dirname, "../public")));

// Sample route
app.get('/', (req, res) => {
  return res.send('Hello, World from Prisma!');
});

// Seed route (just run once)
app.use('/api/seed', seedRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/ustadz', ustadzRoutes);
app.use('/api/ortu', ortuRoutes);
app.use('/api/santri', santriRoutes);
app.use('/api/chart', chartRoutes);
app.use('/api/hafalan', hafalanRoutes);
app.use('/api/alquran', alquranRoutes);

export default app;
