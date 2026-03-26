import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { db, storage } from './config/firebase.js';
import { generateKeys, getPublicKey } from './utils/keyManager.js';
import { authenticateToken } from './middleware/auth.js';
import authRoutes from './routes/authRoutes.js';
import { generalRateLimit, uploadRateLimit } from './middleware/rateLimiter.js';
import logger from './utils/logger.js';
import { addFileJob } from './queue/fileQueue.js';
import './queue/fileWorker.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const bucketName = process.env.GCS_BUCKET_NAME || 'your-bucket-name';
const bucket = storage.bucket(bucketName);

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
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/public-key', (req, res) => {
  const key = getPublicKey();
  if (!key) {
    logger.error("Public key request failed: Keys not yet generated");
    return res.status(503).json({ error: 'Keys not yet generated' });
  }
  logger.info("Public key served to client", { ip: req.ip });
  res.json({ publicKey: key });
});

// Upload Endpoint
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
}); // Keep memory storage for buffering small chunks if needed, or stream directly

app.post('/api/upload', uploadRateLimit, authenticateToken, upload.fields([
  { name: 'encryptedFile', maxCount: 1 },
  { name: 'encryptedKey', maxCount: 1 },
  { name: 'iv', maxCount: 1 }
]), async (req: any, res: any) => {
  try {
    const { originalName } = req.body;
    const userId = req.user.uid;
    // Access files from req.files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files || !files['encryptedFile']?.[0] || !files['encryptedKey']?.[0] || !files['iv']?.[0]) {
      res.status(400).json({ error: 'Missing required files' });
      return;
    }

    const encryptedFileBuffer = files['encryptedFile'][0].buffer;
    const encryptedKeyBuffer = files['encryptedKey'][0].buffer;
    const ivBuffer = files['iv'][0].buffer;

    // 1. Queue background job to process the file and upload to Google Cloud Storage
    const job = await addFileJob({
      originalName,
      userId,
      encryptedFileBuffer,
      encryptedKeyBase64: encryptedKeyBuffer.toString('base64'),
      ivBase64: ivBuffer.toString('base64'),
      size: encryptedFileBuffer.length,
      contentType: 'application/octet-stream'
    });

    res.json({
      status: 'success',
      message: 'File upload queued for background processing',
      jobId: job.id
    });

  } catch (error) {
    logger.error("Upload process failed", {
      error,
      userId: req.user?.uid
    });
    res.status(500).json({ error: 'Processing failed' });
  }
});


const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server initialized and listening on port ${PORT}`, { env: process.env.NODE_ENV });
});
