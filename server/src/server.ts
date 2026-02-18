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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const bucketName = process.env.GCS_BUCKET_NAME || 'your-bucket-name';
const bucket = storage.bucket(bucketName);

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost', 'http://localhost:80'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());


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
    return res.status(503).json({ error: 'Keys not yet generated' });
  }
  console.log("Sending public key to client")
  res.json({ publicKey: key });
});

// Upload Endpoint
const upload = multer({ storage: multer.memoryStorage() }); // Keep memory storage for buffering small chunks if needed, or stream directly

app.post('/api/upload', authenticateToken, upload.fields([
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

    // 1. Upload to Google Cloud Storage
    const timestamp = Date.now();
    const destination = `uploads/${timestamp}_${originalName}`;
    const file = bucket.file(destination);

    await file.save(encryptedFileBuffer, {
      contentType: 'application/octet-stream',
      resumable: false // Simple upload for now
    });

    const storagePath = `gs://${bucket.name}/${destination}`;

    // 2. Save Metadata to Firestore
    // Store the encrypted key and IV as base64 strings or Blobs in Firestore
    const metadata = {
      userId,
      originalName,
      storagePath, // gs://bucket-name/path/to/file
      storageType: 'gcs',
      uploadDate: new Date(),
      encryptedKey: encryptedKeyBuffer.toString('base64'),
      iv: ivBuffer.toString('base64'),
      size: encryptedFileBuffer.length,
      contentType: 'application/octet-stream'
    };

    const docRef = await db.collection('files').add(metadata);

    console.log(`File uploaded to GCS: ${storagePath}`);
    console.log(`Metadata saved to Firestore: ${docRef.id}`);

    res.json({
      status: 'success',
      message: 'File uploaded securely to Google Cloud Storage',
      fileId: docRef.id
    });

  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});


const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
