import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';

interface IngestMessageBody {
  activityType: string;
  content: string;
  teamId: string;
  metadata?: Record<string, any>;
}

interface IngestBatchBody {
  messages: IngestMessageBody[];
}

/**
 * Fast endpoint to ingest messages without processing
 * Messages are stored with processed=false for later batch processing
 */
export const ingestMessage = async (
  req: Request<{}, {}, IngestMessageBody>,
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

    // Simply store the message, no embedding yet
    const activity = await prisma.activity.create({
      data: {
        userId,
        teamId,
        activityType,
        content,
        metadata: metadata || {},
        processed: false, // Mark as unprocessed for batch job
      },
    });

    res.status(201).json({
      message: 'Message received and queued for processing',
      activity: {
        id: activity.id,
        timestamp: activity.timestamp,
        processed: false,
      },
    });
  } catch (error) {
    console.error('Ingest message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Batch ingest multiple messages at once
 * Even faster for bulk data ingestion
 */
export const ingestBatch = async (
  req: Request<{}, {}, IngestBatchBody>,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = (req as any).user.id;
    const { messages } = req.body;

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required and cannot be empty' });
      return;
    }

    // Batch insert for maximum performance
    const activities = await prisma.activity.createMany({
      data: messages.map((msg) => ({
        userId,
        teamId: msg.teamId,
        activityType: msg.activityType,
        content: msg.content,
        metadata: msg.metadata || {},
        processed: false,
      })),
    });

    res.status(201).json({
      message: `${activities.count} messages received and queued for processing`,
      count: activities.count,
      processed: false,
    });
  } catch (error) {
    console.error('Ingest batch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get stats on unprocessed messages
 */
export const getProcessingStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { teamId } = req.query;

    const whereClause: any = { userId };
    if (teamId) {
      whereClause.teamId = teamId as string;
    }

    const [unprocessedCount, processedCount, totalCount] = await Promise.all([
      prisma.activity.count({
        where: { ...whereClause, processed: false },
      }),
      prisma.activity.count({
        where: { ...whereClause, processed: true },
      }),
      prisma.activity.count({
        where: whereClause,
      }),
    ]);

    // Get oldest unprocessed message
    const oldestUnprocessed = await prisma.activity.findFirst({
      where: { ...whereClause, processed: false },
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    });

    res.status(200).json({
      total: totalCount,
      processed: processedCount,
      unprocessed: unprocessedCount,
      processingRate: totalCount > 0 ? (processedCount / totalCount) * 100 : 0,
      oldestUnprocessed: oldestUnprocessed?.timestamp || null,
    });
  } catch (error) {
    console.error('Get processing stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
