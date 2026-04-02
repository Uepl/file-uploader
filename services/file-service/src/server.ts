import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from '@uploader/shared/logger';
import fileRoutes from './routes/fileRoutes.js';

dotenv.config();

const app = express();
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost', 'http://localhost:80'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API Routes
app.use('/api', fileRoutes);

const PORT = Number(process.env.FILE_SERVICE_PORT) || 3002;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`File Service initialized and listening on port ${PORT}`);
});
