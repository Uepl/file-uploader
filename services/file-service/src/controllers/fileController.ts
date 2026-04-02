import { Request, Response } from 'express';
import crypto from 'node:crypto';
import { logger } from '@uploader/shared/logger';
import { storage } from '@uploader/shared/firebase';
import { getPublicKey, getPrivateKey } from '@uploader/shared/keys';
import { addFileJob } from '@uploader/shared/queue';
import { FileModel } from '@uploader/shared/models';
import busboy from 'busboy';

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

export const uploadFile = async (req: Request, res: Response) => {
  try {
    const bb = busboy({ headers: req.headers });
    const userId = (req as any).user?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let storagePath = '';
    let fileSize = 0;
    const fields: Record<string, string> = {};
    const uploadPromises: Promise<void>[] = [];

    bb.on('file', (name, file, info) => {
      if (name === 'encryptedFile') {
        const timestamp = Date.now();
        const destination = `uploads/${timestamp}_${info.filename}`;
        const gcsFile = bucket.file(destination);

        const writeStream = gcsFile.createWriteStream({
          resumable: true,
          contentType: 'application/octet-stream'
        });

        const uploadPromise = new Promise<void>((resolve, reject) => {
          writeStream.on('error', (err) => {
            logger.error('GCS write stream error', err);
            reject(err);
          });
          writeStream.on('finish', () => {
            storagePath = `gs://${bucket.name}/${destination}`;
            resolve();
          });
        });

        uploadPromises.push(uploadPromise);
        file.pipe(writeStream);

        file.on('data', (chunk) => {
          fileSize += chunk.length;
        });
      } else {
        file.resume();
      }
    });

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('finish', async () => {
      try {
        await Promise.all(uploadPromises);

        if (!storagePath) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const job = await addFileJob({
          originalName: fields['originalName'] || 'unnamed',
          userId,
          storagePath,
          encryptedKeyBase64: fields['encryptedKey'],
          ivBase64: fields['iv'],
          size: fileSize,
          contentType: 'application/octet-stream'
        });

        res.json({
          status: 'success',
          message: 'File upload streamed and queued',
          jobId: job.id
        });
      } catch (error: any) {
        logger.error("Streaming upload failed during finish", { error: error.message });
        if (!res.headersSent) {
          res.status(500).json({ error: 'Upload failed' });
        }
      }
    });

    bb.on('error', (err) => {
      logger.error('Busboy error', err);
      if (!res.headersSent) {
        res.status(400).json({ error: 'Upload parsing error' });
      }
    });

    req.pipe(bb);
  } catch (error: any) {
    logger.error("Upload process failed", {
      error: error.message,
      userId: (req as any).user?.uid
    });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Processing failed' });
    }
  }
};

export const listFiles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid;
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
  } catch (error: any) {
    logger.error("List files failed", { error: error.message, userId: (req as any).user?.uid });
    res.status(500).json({ error: 'Failed to list files' });
  }
};

export const downloadFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid;
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
    } catch (error: any) {
      logger.error("Failed to unwrap AES key", { error: error.message, fileId });
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
  } catch (error: any) {
    logger.error("Download file failed", { error: error.message, fileId: req.params.fileId, userId: (req as any).user?.uid });
    res.status(500).json({ error: 'Failed to download file' });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid;
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
  } catch (error: any) {
    logger.error("Delete file failed", { error: error.message, fileId: req.params.fileId, userId: (req as any).user?.uid });
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

export const renameFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid;
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
  } catch (error: any) {
    logger.error("Rename file failed", { error: error.message, fileId: req.params.fileId, userId: (req as any).user?.uid });
    res.status(500).json({ error: 'Failed to rename file' });
  }
};
