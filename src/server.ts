import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve static files from the 'dist' directory (after build)
app.use(express.static(path.join(__dirname, '../dist')));

// --- RSA Key Management ---
let publicKeyPem: string;
let privateKeyPem: string;

const generateKeys = () => {
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
  console.log('RSA Key Pair Generated');
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
app.post('/api/upload', (req, res) => {
  // In a real scenario, we would stream this to disk or S3
  // For this demo, we'll just log the receipt and size
  try {
    const { encryptedFile, encryptedKey, iv, originalName } = req.body;

    if (!encryptedFile || !encryptedKey || !iv) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // --- SECURITY CRITICAL ---
    // The server NEVER decrypts the file. It only stores the encrypted blobs.
    // We can demonstrate that we HAVE the key, but we shouldn't use it to decrypt the file content here
    // to allow for "Zero Knowledge" storage.
    // However, to prove the hybrid scheme works, we *could* decrypt the AES key using our Private Key,
    // but we will NOT decrypt the file content.

    // 1. Decrypt the AES Key using Server's Private Key
    const aesKeyBuffer = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encryptedKey, 'base64')
    );

    console.log('--- File Upload Received ---');
    console.log(`Original Name: ${originalName}`);
    console.log(`Encrypted File Size: ${encryptedFile.length} bytes (Base64)`);
    console.log(`Encrypted AES Key: ${encryptedKey.substring(0, 20)}...`);
    console.log(`Decrypted AES Key (Server Eyes Only): ${aesKeyBuffer.toString('hex')}`);
    console.log('----------------------------');

    res.json({ status: 'success', message: 'File uploaded securely' });

  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ error: 'Upload processing failed' });
  }
});

// Fallback to index.html for SPA routing
console.log('__dirname:', __dirname);
/*
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
*/

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
