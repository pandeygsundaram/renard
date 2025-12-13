import { Request, Response } from 'express';
import {
  processPendingActivities,
  processPendingActivitiesByTeam,
  getUnprocessedCount,
} from '../services/batchProcessor';

/**
 * Manually trigger batch processing
 * Admin only endpoint
 */
export const triggerProcessing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchSize = 100, limit = 10000, teamId } = req.query;

    console.log('[Processing API] Manual trigger received');

    const result = teamId
      ? await processPendingActivitiesByTeam(
          teamId as string,
          parseInt(batchSize as string),
          parseInt(limit as string)
        )
      : await processPendingActivities(
          parseInt(batchSize as string),
          parseInt(limit as string)
        );

    res.status(200).json({
      message: 'Batch processing completed',
      result,
    });
  } catch (error) {
    console.error('Trigger processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get processing queue status
 */
export const getQueueStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const unprocessedCount = await getUnprocessedCount();

    res.status(200).json({
      unprocessedCount,
      status: unprocessedCount > 0 ? 'pending' : 'idle',
    });
  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
