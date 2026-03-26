import { Router } from 'express';
import { register, login, listFiles, downloadFile, deleteFile, renameFile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadRateLimit } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// File management routes (all require authentication)
router.get('/files', authenticateToken, listFiles);
router.get('/files/:fileId/download', authenticateToken, uploadRateLimit, downloadFile);
router.delete('/files/:fileId', authenticateToken, deleteFile);
router.patch('/files/:fileId', authenticateToken, renameFile);

export default router;