import { Router } from 'express';
import { healthCheck } from '../controllers/generalController.js';

const router = Router();

router.get('/health', healthCheck);

export default router;
