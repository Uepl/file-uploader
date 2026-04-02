import { Worker, Job } from 'bullmq';
import dotenv from 'dotenv';
import { logger } from '@uploader/shared/logger';
import { redisConnection } from '@uploader/shared/queue';
import { storage } from '@uploader/shared/firebase';
import { FileModel } from '@uploader/shared/models';

dotenv.config();

const bucketName = process.env.GCS_BUCKET_NAME || 'your-bucket-name';

const processFile = async (job: Job) => {
  const { originalName, userId, storagePath, encryptedKeyBase64, ivBase64, size, contentType } = job.data;

  logger.info(`Worker starting processing for job ${job.id}`);

  try {
    if (!storagePath) {
      throw new Error(`No storagePath provided for job ${job.id}`);
    }

    const pathWithoutBucket = storagePath.replace(`gs://${bucketName}/`, '');
    const [exists] = await storage.bucket(bucketName).file(pathWithoutBucket).exists();
    if (!exists) {
      throw new Error(`File not found at ${pathWithoutBucket}. Aborting metadata save.`);
    }

    // Save Metadata to Firestore
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
  } catch (error: any) {
    logger.error(`Worker failed processing job ${job.id}`, { error: error.message });
    throw error;
  }
};

const fileWorker = new Worker('file-processing', processFile, { connection: redisConnection });

fileWorker.on('completed', (job) => {
  logger.info(`Job ${job?.id} has completed successfully`);
});

fileWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} has failed with ${err.message}`);
});

logger.info('Worker service initialized and processing jobs');
