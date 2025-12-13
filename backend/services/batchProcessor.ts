import prisma from '../config/database';
import { generateEmbeddingsBatch } from './embeddingService';
import qdrantClient from '../config/qdrant';
import { COLLECTIONS } from './vectorService';

interface ProcessingResult {
  total: number;
  processed: number;
  failed: number;
  errors: string[];
}

/**
 * Process unprocessed activities in batches
 * This is meant to be run periodically (e.g., every 24 hours)
 * @param batchSize Number of activities to process at once
 * @param limit Maximum total activities to process in this run
 */
export async function processPendingActivities(
  batchSize: number = 100,
  limit: number = 10000
): Promise<ProcessingResult> {
  console.log(`[Batch Processor] Starting batch processing...`);
  console.log(`[Batch Processor] Batch size: ${batchSize}, Limit: ${limit}`);

  const result: ProcessingResult = {
    total: 0,
    processed: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get unprocessed activities
    const unprocessedActivities = await prisma.activity.findMany({
      where: { processed: false },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });

    result.total = unprocessedActivities.length;

    if (result.total === 0) {
      console.log('[Batch Processor] No unprocessed activities found');
      return result;
    }

    console.log(`[Batch Processor] Found ${result.total} unprocessed activities`);

    // Process in batches
    for (let i = 0; i < unprocessedActivities.length; i += batchSize) {
      const batch = unprocessedActivities.slice(i, i + batchSize);
      console.log(
        `[Batch Processor] Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)`
      );

      try {
        await processBatch(batch);
        result.processed += batch.length;
      } catch (error) {
        const errorMsg = `Batch ${Math.floor(i / batchSize) + 1} failed: ${error}`;
        console.error(`[Batch Processor] ${errorMsg}`);
        result.errors.push(errorMsg);
        result.failed += batch.length;
      }

      // Small delay between batches to avoid rate limits
      if (i + batchSize < unprocessedActivities.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`[Batch Processor] Completed!`);
    console.log(`[Batch Processor] Processed: ${result.processed}, Failed: ${result.failed}`);

    return result;
  } catch (error) {
    console.error('[Batch Processor] Fatal error:', error);
    result.errors.push(`Fatal error: ${error}`);
    return result;
  }
}

/**
 * Process a single batch of activities
 */
async function processBatch(activities: any[]): Promise<void> {
  if (activities.length === 0) return;

  // Extract content for embedding
  const contents = activities.map((a) => a.content);

  // Generate embeddings in batch (more efficient)
  const embeddings = await generateEmbeddingsBatch(contents);

  // Prepare Qdrant points
  const points = activities.map((activity, index) => ({
    id: activity.id,
    vector: embeddings[index].embedding,
    payload: {
      activityId: activity.id,
      userId: activity.userId,
      teamId: activity.teamId,
      activityType: activity.activityType,
      text: activity.content,
      timestamp: activity.timestamp.toISOString(),
      metadata: activity.metadata,
    },
  }));

  // Upsert to Qdrant in batch
  await qdrantClient.upsert(COLLECTIONS.ACTIVITIES, {
    wait: true,
    points,
  });

  // Update database: mark as processed and store vectorId
  const updatePromises = activities.map((activity) =>
    prisma.activity.update({
      where: { id: activity.id },
      data: {
        vectorId: activity.id,
        processed: true,
      },
    })
  );

  await Promise.all(updatePromises);
}

/**
 * Get count of unprocessed activities
 */
export async function getUnprocessedCount(): Promise<number> {
  return await prisma.activity.count({
    where: { processed: false },
  });
}

/**
 * Get count of unprocessed activities by team
 */
export async function getUnprocessedCountByTeam(teamId: string): Promise<number> {
  return await prisma.activity.count({
    where: {
      teamId,
      processed: false,
    },
  });
}

/**
 * Process activities for a specific team only
 */
export async function processPendingActivitiesByTeam(
  teamId: string,
  batchSize: number = 100,
  limit: number = 10000
): Promise<ProcessingResult> {
  console.log(`[Batch Processor] Starting batch processing for team ${teamId}...`);

  const result: ProcessingResult = {
    total: 0,
    processed: 0,
    failed: 0,
    errors: [],
  };

  try {
    const unprocessedActivities = await prisma.activity.findMany({
      where: {
        teamId,
        processed: false,
      },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });

    result.total = unprocessedActivities.length;

    if (result.total === 0) {
      console.log(`[Batch Processor] No unprocessed activities found for team ${teamId}`);
      return result;
    }

    console.log(`[Batch Processor] Found ${result.total} unprocessed activities for team`);

    for (let i = 0; i < unprocessedActivities.length; i += batchSize) {
      const batch = unprocessedActivities.slice(i, i + batchSize);

      try {
        await processBatch(batch);
        result.processed += batch.length;
      } catch (error) {
        const errorMsg = `Batch failed: ${error}`;
        console.error(`[Batch Processor] ${errorMsg}`);
        result.errors.push(errorMsg);
        result.failed += batch.length;
      }

      if (i + batchSize < unprocessedActivities.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return result;
  } catch (error) {
    console.error('[Batch Processor] Fatal error:', error);
    result.errors.push(`Fatal error: ${error}`);
    return result;
  }
}
