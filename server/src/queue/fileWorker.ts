import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger.js';
import { db, storage } from '../config/firebase.js';

const bucketName = process.env.GCS_BUCKET_NAME || 'your-bucket-name';

// Need to safely check if bucket exists because during test/dev it might fail without credentials
let bucket: any;
try {
  bucket = storage.bucket(bucketName);
} catch (e) {
  logger.error("Failed to initialize Google Cloud Storage bucket in worker", e);
}

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = Number(process.env.REDIS_PORT) || 18101;
const username = process.env.REDIS_USERNAME || 'default';
const password = process.env.REDIS_PASSWORD || 'my-top-secret';
const connection = new IORedis({
  host: redisHost,
  port: redisPort,
  username: username,
  password: password,
  maxRetriesPerRequest: null,
});

const processFile = async (job: Job) => {
  const { originalName, userId, encryptedFileBuffer, encryptedKeyBase64, ivBase64, size, contentType } = job.data;

  logger.info(`Worker starting processing for job ${job.id}`);

  try {
    // Note: Passing raw Buffers through Redis is unoptimized for large files. 
    // In production with 100MB+ files, it's better to save to disk first and pass the filepath.
    const fileBuffer = Buffer.from(encryptedFileBuffer);

    // 1. Upload to Google Cloud Storage
    const timestamp = Date.now();
    const destination = `uploads/${timestamp}_${originalName}`;
    const file = bucket.file(destination);

    await file.save(fileBuffer, {
      contentType: contentType,
      resumable: false
    });

    const storagePath = `gs://${bucket.name}/${destination}`;

    // 2. Save Metadata to Firestore
    const metadata = {
      userId,
      originalName,
      storagePath,
      storageType: 'gcs',
      uploadDate: new Date(),
      encryptedKey: encryptedKeyBase64,
      iv: ivBase64,
      size,
      contentType
    };

    const docRef = await db.collection('files').add(metadata);

    logger.info(`Worker finished job ${job.id}: Upload successful`, {
      userId,
      fileId: docRef.id,
      storagePath,
      size
    });

    return { fileId: docRef.id, storagePath };
  } catch (error) {
    logger.error(`Worker failed processing job ${job.id}`, error);
    throw error;
  }
};

export const fileWorker = new Worker('file-processing', processFile, { connection });

fileWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} has completed successfully`);
});

fileWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} has failed with ${err.message}`);
});
