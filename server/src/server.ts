import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { generateKeys } from './utils/keyManager.js';
import authRoutes from './routes/authRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import generalRoutes from './routes/generalRoutes.js';
import { generalRateLimit } from './middleware/rateLimiter.js';
import logger from './utils/logger.js';
import './queue/fileWorker.js';

const app = express();
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost', 'http://localhost:80', 'https://file-uploader-in-dierl.duckdns.org'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use(generalRateLimit);

// Generate keys on startup
generateKeys();

// API Routes
app.use('/api', generalRoutes);
app.use('/api', fileRoutes);
app.use('/api/auth', authRoutes);

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server initialized and listening on port ${PORT}`, { env: process.env.NODE_ENV });
});

