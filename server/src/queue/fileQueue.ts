import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger.js';

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

export const fileQueue = new Queue('file-processing', { connection });

export const addFileJob = async (jobData: any) => {
  try {
    const job = await fileQueue.add('upload-and-process', jobData);
    logger.info(`Added file job ${job.id} to queue`);
    return job;
  } catch (error) {
    logger.error('Failed to add file job to queue', error);
    throw error;
  }
};
