import { Router } from 'express';
import { body } from 'express-validator';
import {
  createTeam,
  getUserTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from '../controllers/teamController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create a new team
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Team name is required'),
    body('description').optional(),
    body('type').optional().isIn(['PERSONAL', 'ORGANIZATION']).withMessage('Invalid team type'),
  ],
  createTeam
);

// Get all teams for the current user
router.get('/', getUserTeams);

// Get a specific team by ID
router.get('/:id', getTeamById);

// Update a team
router.put(
  '/:id',
  [
    body('name').optional().notEmpty().withMessage('Team name cannot be empty'),
    body('description').optional(),
    body('settings').optional(),
  ],
  updateTeam
);

// Delete a team (soft delete)
router.delete('/:id', deleteTeam);

// Add a member to the team
router.post(
  '/:id/members',
  [
    body('userEmail').isEmail().withMessage('Valid email is required'),
    body('role').optional().isIn(['OWNER', 'ADMIN', 'MEMBER']).withMessage('Invalid role'),
  ],
  addTeamMember
);

// Remove a member from the team
router.delete('/:id/members/:memberId', removeTeamMember);

export default router;
