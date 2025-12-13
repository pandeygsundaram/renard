import qdrantClient from '../config/qdrant';
import { generateEmbedding } from './embeddingService';

// Collection names
export const COLLECTIONS = {
  ACTIVITIES: 'activities',
  WORKLOGS: 'worklogs',
};

// Embedding dimension for text-embedding-3-small
const VECTOR_DIMENSION = 1536;

/**
 * Initialize Qdrant collections if they don't exist
 */
export async function initializeCollections(): Promise<void> {
  try {
    // Check and create activities collection
    const collections = await qdrantClient.getCollections();
    const collectionNames = collections.collections.map(c => c.name);

    if (!collectionNames.includes(COLLECTIONS.ACTIVITIES)) {
      await qdrantClient.createCollection(COLLECTIONS.ACTIVITIES, {
        vectors: {
          size: VECTOR_DIMENSION,
          distance: 'Cosine',
        },
      });

      // Create indexes for filtering
      await qdrantClient.createPayloadIndex(COLLECTIONS.ACTIVITIES, {
        field_name: 'userId',
        field_schema: 'keyword',
      });

      await qdrantClient.createPayloadIndex(COLLECTIONS.ACTIVITIES, {
        field_name: 'teamId',
        field_schema: 'keyword',
      });

      console.log(`✓ Created collection: ${COLLECTIONS.ACTIVITIES}`);
    }

    if (!collectionNames.includes(COLLECTIONS.WORKLOGS)) {
      await qdrantClient.createCollection(COLLECTIONS.WORKLOGS, {
        vectors: {
          size: VECTOR_DIMENSION,
          distance: 'Cosine',
        },
      });
      console.log(`✓ Created collection: ${COLLECTIONS.WORKLOGS}`);
    }

    console.log('✓ Qdrant collections initialized');
  } catch (error) {
    console.error('Error initializing Qdrant collections:', error);
    throw error;
  }
}

/**
 * Store activity with embedding in Qdrant
 * @param activityId UUID of the activity
 * @param text Text content to embed and store
 * @param metadata Additional metadata to store with the vector
 * @returns The Qdrant point ID
 */
export async function storeActivityVector(
  activityId: string,
  text: string,
  metadata: Record<string, any> = {}
): Promise<string> {
  try {
    // Generate embedding
    const { embedding } = await generateEmbedding(text);

    // Store in Qdrant
    const pointId = activityId; // Use activity UUID as point ID
    await qdrantClient.upsert(COLLECTIONS.ACTIVITIES, {
      wait: true,
      points: [
        {
          id: pointId,
          vector: embedding,
          payload: {
            activityId,
            text,
            timestamp: new Date().toISOString(),
            ...metadata,
          },
        },
      ],
    });

    return pointId;
  } catch (error) {
    console.error('Error storing activity vector:', error);
    throw new Error('Failed to store activity vector');
  }
}

/**
 * Store worklog with embedding in Qdrant
 * @param worklogId UUID of the worklog
 * @param text Text content to embed and store
 * @param metadata Additional metadata to store with the vector
 * @returns The Qdrant point ID
 */
export async function storeWorklogVector(
  worklogId: string,
  text: string,
  metadata: Record<string, any> = {}
): Promise<string> {
  try {
    // Generate embedding
    const { embedding } = await generateEmbedding(text);

    // Store in Qdrant
    const pointId = worklogId; // Use worklog UUID as point ID
    await qdrantClient.upsert(COLLECTIONS.WORKLOGS, {
      wait: true,
      points: [
        {
          id: pointId,
          vector: embedding,
          payload: {
            worklogId,
            text,
            timestamp: new Date().toISOString(),
            ...metadata,
          },
        },
      ],
    });

    return pointId;
  } catch (error) {
    console.error('Error storing worklog vector:', error);
    throw new Error('Failed to store worklog vector');
  }
}

/**
 * Search for similar activities
 * @param query Search query text
 * @param limit Number of results to return
 * @param filter Optional metadata filter
 * @returns Array of similar activities with scores
 */
export async function searchSimilarActivities(
  query: string,
  limit: number = 10,
  filter?: Record<string, any>
): Promise<any[]> {
  try {
    // Generate embedding for query
    const { embedding } = await generateEmbedding(query);

    // Search in Qdrant
    const results = await qdrantClient.search(COLLECTIONS.ACTIVITIES, {
      vector: embedding,
      limit,
      filter: filter,
      with_payload: true,
    });

    return results;
  } catch (error) {
    console.error('Error searching similar activities:', error);
    throw new Error('Failed to search similar activities');
  }
}

/**
 * Search for similar worklogs
 * @param query Search query text
 * @param limit Number of results to return
 * @param filter Optional metadata filter
 * @returns Array of similar worklogs with scores
 */
export async function searchSimilarWorklogs(
  query: string,
  limit: number = 10,
  filter?: Record<string, any>
): Promise<any[]> {
  try {
    // Generate embedding for query
    const { embedding } = await generateEmbedding(query);

    // Search in Qdrant
    const results = await qdrantClient.search(COLLECTIONS.WORKLOGS, {
      vector: embedding,
      limit,
      filter: filter,
      with_payload: true,
    });

    return results;
  } catch (error) {
    console.error('Error searching similar worklogs:', error);
    throw new Error('Failed to search similar worklogs');
  }
}

/**
 * Delete activity vector from Qdrant
 * @param activityId UUID of the activity
 */
export async function deleteActivityVector(activityId: string): Promise<void> {
  try {
    await qdrantClient.delete(COLLECTIONS.ACTIVITIES, {
      wait: true,
      points: [activityId],
    });
  } catch (error) {
    console.error('Error deleting activity vector:', error);
    throw new Error('Failed to delete activity vector');
  }
}

/**
 * Delete worklog vector from Qdrant
 * @param worklogId UUID of the worklog
 */
export async function deleteWorklogVector(worklogId: string): Promise<void> {
  try {
    await qdrantClient.delete(COLLECTIONS.WORKLOGS, {
      wait: true,
      points: [worklogId],
    });
  } catch (error) {
    console.error('Error deleting worklog vector:', error);
    throw new Error('Failed to delete worklog vector');
  }
}
