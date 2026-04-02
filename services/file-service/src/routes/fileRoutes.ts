import { Router } from 'express';
import {
  getPublicKeyHandler,
  uploadFile,
  listFiles,
  downloadFile,
  deleteFile,
  renameFile
} from '../controllers/fileController.js';
import { authenticateToken, uploadRateLimit } from '@uploader/shared/middleware';

const router = Router();

router.get('/public-key', getPublicKeyHandler);

router.post('/upload', uploadRateLimit, authenticateToken, uploadFile);

// File management routes
router.get('/files', authenticateToken, listFiles);
router.get('/files/:fileId/download', authenticateToken, uploadRateLimit, downloadFile);
router.delete('/files/:fileId', authenticateToken, deleteFile);
router.patch('/files/:fileId', authenticateToken, renameFile);

export default router;
