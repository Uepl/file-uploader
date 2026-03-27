import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger.js';
import { storage } from '../config/firebase.js';
import { FileModel } from '../models/fileModel.js';

const bucketName = process.env.GCS_BUCKET_NAME || 'your-bucket-name';

// Bucket initialization removed as GCS upload now happens in the controller

const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const connection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
});

const processFile = async (job: Job) => {
  const { originalName, userId, storagePath, encryptedKeyBase64, ivBase64, size, contentType } = job.data;

  logger.info(`Worker starting processing for job ${job.id}`);

  try {
    // 1. Storage path is now provided by the controller, so no upload is needed here.
    if (!storagePath) {
      throw new Error(`No storagePath provided for job ${job.id}`);
    }

    const pathWithoutBucket = storagePath.replace(`gs://${bucketName}/`, '');
    const [exists] = await storage.bucket(bucketName).file(pathWithoutBucket).exists();
    if (!exists) {
      throw new Error(`File not found at ${pathWithoutBucket}. Aborting metadata save.`);
    }

    // 2. Save Metadata to Firestore using FileModel
    const fileId = await FileModel.create({
      userId,
      originalName,
      storagePath,
      storageType: 'gcs',
      uploadDate: new Date(),
      encryptedKey: encryptedKeyBase64,
      iv: ivBase64,
      size,
      contentType
    });

    logger.info(`Worker finished job ${job.id}: Metadata saved successfully`, {
      userId,
      fileId,
      storagePath,
      size
    });

    return { fileId, storagePath };
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

