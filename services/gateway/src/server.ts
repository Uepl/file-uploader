import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { logger } from '@uploader/shared/logger';
import { generalRateLimit } from '@uploader/shared/middleware';

dotenv.config();

const app = express();
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost', 'http://localhost:80', 'https://file-uploader-in-dierl.duckdns.org'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply general rate limit to all requests at gateway level
app.use(generalRateLimit);

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'http://localhost:3002';

// Health check for gateway itself
app.get('/api/health', (req, res) => {
  res.json({ status: 'Gateway OK' });
});

// Proxy logic
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    // No rewrite needed if auth-service handles /api/auth
  },
  logger: logger
}));

app.use('/api', createProxyMiddleware({
  target: FILE_SERVICE_URL,
  changeOrigin: true,
  logger: logger
}));

const PORT = Number(process.env.GATEWAY_PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`API Gateway initialized and listening on port ${PORT}`);
});
