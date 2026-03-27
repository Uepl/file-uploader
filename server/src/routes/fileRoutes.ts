import { Router } from 'express';
import multer from 'multer';
import { 
  getPublicKeyHandler, 
  uploadFile, 
  listFiles, 
  downloadFile, 
  deleteFile, 
  renameFile 
} from '../controllers/fileController.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadRateLimit } from '../middleware/rateLimiter.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.get('/public-key', getPublicKeyHandler);

router.post('/upload', uploadRateLimit, authenticateToken, upload.fields([
  { name: 'encryptedFile', maxCount: 1 },
  { name: 'encryptedKey', maxCount: 1 },
  { name: 'iv', maxCount: 1 }
]), uploadFile);

// File management routes
router.get('/files', authenticateToken, listFiles);
router.get('/files/:fileId/download', authenticateToken, uploadRateLimit, downloadFile);
router.delete('/files/:fileId', authenticateToken, deleteFile);
router.patch('/files/:fileId', authenticateToken, renameFile);

export default router;
