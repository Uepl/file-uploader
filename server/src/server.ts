import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import multer from 'multer';
import { db, storage } from './firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const bucketName = process.env.GCS_BUCKET_NAME || 'your-bucket-name';
const bucket = storage.bucket(bucketName);

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve static files from the 'dist' directory (after build)
app.use(express.static(path.join(__dirname, '../dist')));

// --- RSA Key Management ---
// WARNING: Generating keys on startup means if the server restarts, 
// the Private Key changes, and previous uploads CANNOT be decrypted.
// For production, load these keys from a secure file or environment variable.
let publicKeyPem: string;
let privateKeyPem: string;


const rawKey = process.env.PRIVATE_KEY || '';

const formattedKey = rawKey
  .replace(/\\n/g, '\n')      // Convert literal \n to actual newlines
  .replace(/"/g, '')          // Remove any accidental wrapping quotes
  .trim();


const generateKeys = () => {
  if (formattedKey) {
    try {
      privateKeyPem = formattedKey;
      const publicKeyObject = crypto.createPublicKey(privateKeyPem);
      publicKeyPem = publicKeyObject.export({
        type: 'spki',
        format: 'pem'
      }) as string;

      console.log('✅ Success: RSA Key pair ready.');
    } catch (error) {
      console.error('❌ Critical Error: The PRIVATE_KEY in .env is invalid!');
      console.error('Reason:', error);
      // Optional: process.exit(1); 
    }
  } else {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    publicKeyPem = publicKey;
    privateKeyPem = privateKey;
    console.log('RSA Key Pair Generated (Warning: Ephemeral Keys)');
  }

};

// Generate keys on startup
generateKeys();

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/public-key', (req, res) => {
  if (!publicKeyPem) {
    return res.status(503).json({ error: 'Keys not yet generated' });
  }
  res.json({ publicKey: publicKeyPem });
});

// Upload Endpoint
const upload = multer({ storage: multer.memoryStorage() }); // Keep memory storage for buffering small chunks if needed, or stream directly



app.post('/api/upload', upload.fields([
  { name: 'encryptedFile', maxCount: 1 },
  { name: 'encryptedKey', maxCount: 1 },
  { name: 'iv', maxCount: 1 }
]), async (req, res) => {
  try {
    const { originalName } = req.body;

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

// Fallback to index.html for SPA routing
console.log('__dirname:', __dirname);
/*
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
*/
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
