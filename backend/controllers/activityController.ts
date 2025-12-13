import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { storeActivityVector, searchSimilarActivities } from '../services/vectorService';

interface CreateActivityBody {
  activityType: string;
  content: string;
  teamId: string;
  metadata?: Record<string, any>;
}

interface SearchActivitiesQuery {
  query: string;
  limit?: string;
  teamId?: string;
}

/**
 * Create a new activity and store its embedding in Qdrant
 */
export const createActivity = async (
  req: Request<{}, {}, CreateActivityBody>,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = (req as any).user.id;
    const { activityType, content, teamId, metadata } = req.body;

    // Create activity in database
    const activity = await prisma.activity.create({
      data: {
        userId,
        teamId,
        activityType,
        content,
        metadata: metadata || {},
        processed: false,
      },
    });

    // Store embedding in Qdrant asynchronously
    try {
      const vectorId = await storeActivityVector(
        activity.id,
        content,
        {
          userId,
          teamId,
          activityType,
          ...(metadata || {}),
        }
      );

      // Update activity with vectorId and mark as processed
      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          vectorId,
          processed: true,
        },
      });

      res.status(201).json({
        message: 'Activity created and embedded successfully',
        activity: {
          ...activity,
          vectorId,
          processed: true,
        },
      });
    } catch (vectorError) {
      console.error('Error storing vector:', vectorError);

      // Activity is created but embedding failed
      res.status(201).json({
        message: 'Activity created but embedding failed',
        activity,
        warning: 'Vector embedding could not be generated. Please check your OpenAI API key.',
      });
    }
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all activities for the authenticated user
 */
export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { teamId, limit = '50', offset = '0' } = req.query;

    const whereClause: any = { userId };
    if (teamId) {
      whereClause.teamId = teamId as string;
    }

    const activities = await prisma.activity.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      activities,
      count: activities.length,
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Search for similar activities using semantic search
 */
export const searchActivities = async (
  req: Request<{}, {}, {}, SearchActivitiesQuery>,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { query, limit = '10', teamId } = req.query;

    if (!query) {
      res.status(400).json({ error: 'Query parameter is required' });
      return;
    }

    // Build filter for Qdrant
    const filter: any = {
      must: [
        {
          key: 'userId',
          match: { value: userId },
        },
      ],
    };

    if (teamId) {
      filter.must.push({
        key: 'teamId',
        match: { value: teamId },
      });
    }

    const results = await searchSimilarActivities(
      query,
      parseInt(limit),
      filter
    );

    // Fetch full activity details from database
    const activityIds = results.map(r => r.id);
    const activities = await prisma.activity.findMany({
      where: {
        id: { in: activityIds },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Merge activities with similarity scores
    const resultsWithActivities = results.map(result => {
      const activity = activities.find(a => a.id === result.id);
      return {
        score: result.score,
        activity,
      };
    });

    res.status(200).json({
      query,
      results: resultsWithActivities,
      count: resultsWithActivities.length,
    });
  } catch (error) {
    console.error('Search activities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single activity by ID
 */
export const getActivityById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const activity = await prisma.activity.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.status(200).json({ activity });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
