import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../logger.js';

const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const connection = new IORedis({
  host: redisHost,
  port: redisPort,
  ...(process.env.REDIS_USERNAME && { username: process.env.REDIS_USERNAME }),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
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

export { connection as redisConnection };
