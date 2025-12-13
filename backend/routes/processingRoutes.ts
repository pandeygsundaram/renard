import { Router } from 'express';
import { triggerProcessing, getQueueStatus } from '../controllers/processingController';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

// All processing routes require authentication
router.use(authenticate);

// Get queue status (any authenticated user)
router.get('/queue', getQueueStatus);

// Trigger processing manually (admin only)
router.post('/trigger', isAdmin, triggerProcessing);

export default router;
