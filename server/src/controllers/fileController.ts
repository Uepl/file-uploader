import { Request, Response } from 'express';
import crypto from 'node:crypto';
import logger from '../utils/logger.js';
import { storage } from '../config/firebase.js';
import { getPublicKey, getPrivateKey } from '../utils/keyManager.js';
import { addFileJob } from '../queue/fileQueue.js';
import { FileModel } from '../models/fileModel.js';

const bucketName = process.env.GCS_BUCKET_NAME || 'your-bucket-name';
const bucket = storage.bucket(bucketName);

export const getPublicKeyHandler = (req: Request, res: Response) => {
  const key = getPublicKey();
  if (!key) {
    logger.error("Public key request failed: Keys not yet generated");
    return res.status(503).json({ error: 'Keys not yet generated' });
  }
  logger.info("Public key served to client", { ip: req.ip });
  res.json({ publicKey: key });
};

export const uploadFile = async (req: any, res: any) => {
  try {
    const { originalName } = req.body;
    const userId = req.user.uid;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files || !files['encryptedFile']?.[0] || !files['encryptedKey']?.[0] || !files['iv']?.[0]) {
      res.status(400).json({ error: 'Missing required files' });
      return;
    }

    const encryptedFileBuffer = files['encryptedFile'][0].buffer;
    const encryptedKeyBuffer = files['encryptedKey'][0].buffer;
    const ivBuffer = files['iv'][0].buffer;

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
};

export const listFiles = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const files = await FileModel.findByUserId(userId);

    const fileList = files.map(file => ({
      id: file.id,
      originalName: file.originalName,
      size: file.size,
      uploadDate: file.uploadDate,
      contentType: file.contentType
    }));

    logger.info("Files listed successfully", { userId, fileCount: fileList.length });
    res.json({ files: fileList });
  } catch (error) {
    logger.error("List files failed", { error, userId: req.user?.uid });
    res.status(500).json({ error: 'Failed to list files' });
  }
};

export const downloadFile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!fileId) {
      return res.status(400).json({ error: 'File ID required' });
    }

    const fileData = await FileModel.findById(fileId);
    if (!fileData || fileData.userId !== userId) {
      logger.warn("Unauthorized download attempt", { fileId, userId, ip: req.ip });
      return res.status(403).json({ error: 'File not found or unauthorized' });
    }

    const storagePath = fileData.storagePath;
    const encryptedKeyBase64 = fileData.encryptedKey;
    const ivBase64 = fileData.iv;

    if (!storagePath || !encryptedKeyBase64 || !ivBase64) {
      return res.status(404).json({ error: 'File metadata incomplete' });
    }

    const pathWithoutBucket = storagePath.replace(`gs://${bucketName}/`, '');
    const file = bucket.file(pathWithoutBucket);

    const [fileBuffer] = await file.download();

    const privateKey = getPrivateKey();
    const encryptedKeyBuffer = Buffer.from(encryptedKeyBase64, 'base64');

    let unwrappedAesKey: Buffer;
    try {
      unwrappedAesKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        encryptedKeyBuffer
      );
    } catch (error) {
      logger.error("Failed to unwrap AES key", { error, fileId });
      return res.status(500).json({ error: 'Failed to process file' });
    }

    res.set({
      'Content-Type': fileData.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileData.originalName || 'file')}"`,
      'Content-Length': fileBuffer.length,
      'X-Encrypted-Key': unwrappedAesKey.toString('base64'),
      'X-IV': ivBase64
    });

    logger.info("File download started", { fileId, userId, size: fileBuffer.length });
    res.send(fileBuffer);
  } catch (error) {
    logger.error("Download file failed", { error, fileId: req.params.fileId, userId: req.user?.uid });
    res.status(500).json({ error: 'Failed to download file' });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!fileId) {
      return res.status(400).json({ error: 'File ID required' });
    }

    const fileData = await FileModel.findById(fileId);
    if (!fileData || fileData.userId !== userId) {
      logger.warn("Unauthorized delete attempt", { fileId, userId, ip: req.ip });
      return res.status(403).json({ error: 'File not found or unauthorized' });
    }

    const storagePath = fileData.storagePath;

    await FileModel.delete(fileId);

    if (storagePath) {
      const pathWithoutBucket = storagePath.replace(`gs://${bucketName}/`, '');
      const file = bucket.file(pathWithoutBucket);
      await file.delete().catch(() => {
        logger.warn("GCS file not found for deletion", { storagePath });
      });
    }

    logger.info("File deleted successfully", { fileId, userId });
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error("Delete file failed", { error, fileId: req.params.fileId, userId: req.user?.uid });
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

export const renameFile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
    const { newName } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!fileId || !newName) {
      return res.status(400).json({ error: 'File ID and new name required' });
    }

    const fileData = await FileModel.findById(fileId);
    if (!fileData || fileData.userId !== userId) {
      logger.warn("Unauthorized rename attempt", { fileId, userId, ip: req.ip });
      return res.status(403).json({ error: 'File not found or unauthorized' });
    }

    await FileModel.update(fileId, { originalName: newName });

    logger.info("File renamed successfully", { fileId, userId, newName });
    res.json({ message: 'File renamed successfully', originalName: newName });
  } catch (error) {
    logger.error("Rename file failed", { error, fileId: req.params.fileId, userId: req.user?.uid });
    res.status(500).json({ error: 'Failed to rename file' });
  }
};

