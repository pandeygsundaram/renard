import { Router } from 'express';
import { body } from 'express-validator';
import {
  createActivity,
  getActivities,
  searchActivities,
  getActivityById,
} from '../controllers/activityController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All activity routes require authentication
router.use(authenticate);

// Create a new activity with embedding
router.post(
  '/',
  [
    body('activityType').notEmpty().withMessage('Activity type is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('teamId').notEmpty().withMessage('Team ID is required'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  ],
  createActivity
);

// Get all activities for authenticated user
router.get('/', getActivities);

// Search activities using semantic search
router.get('/search', searchActivities);

// Get a single activity by ID
router.get('/:id', getActivityById);

export default router;
