import { Router } from 'express';
import authRoutes from './authRoutes';
import activityRoutes from './activityRoutes';
import messageRoutes from './messageRoutes';
import processingRoutes from './processingRoutes';
import teamRoutes from './teamRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/activities', activityRoutes);
router.use('/messages', messageRoutes);
router.use('/processing', processingRoutes);
router.use('/teams', teamRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'DevTrack AI API is running' });
});

export default router;
