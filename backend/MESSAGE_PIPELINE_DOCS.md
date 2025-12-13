# Message Processing Pipeline

A buffered, batch-processing pipeline for ingesting chat messages and processing them with embeddings on a schedule.

## Overview

This pipeline separates **ingestion** from **processing** for better performance and scalability:

1. **Fast Ingestion** - Clients send messages quickly without waiting for embeddings
2. **Buffering** - Messages stored in PostgreSQL with `processed: false`
3. **Scheduled Processing** - Batch job runs periodically (e.g., every 24 hours)
4. **Embedding Generation** - OpenAI generates embeddings in batches
5. **Vector Storage** - Embeddings stored in Qdrant for semantic search

## Why Buffered Processing?

### Benefits:
- ⚡ **Fast ingestion** - No waiting for OpenAI API
- 💰 **Cost efficient** - Batch processing is cheaper
- 🔄 **Retry friendly** - Failed processing can be retried
- 📊 **Better monitoring** - Track processing stats
- 🚀 **Scalable** - Handle high message volumes

### Use Cases:
- Chat message collection from multiple sources
- Browser extension activity tracking
- CLI command logging
- High-volume data ingestion

## API Endpoints

### 1. Ingest Single Message

```bash
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "activityType": "chat",
  "content": "Discussed implementing the authentication flow using OAuth2",
  "teamId": "team-uuid",
  "metadata": {
    "source": "slack",
    "channel": "engineering"
  }
}
```

**Response:**
```json
{
  "message": "Message received and queued for processing",
  "activity": {
    "id": "uuid",
    "timestamp": "2025-12-13T14:30:00.000Z",
    "processed": false
  }
}
```

### 2. Batch Ingest (Multiple Messages)

For maximum performance when ingesting many messages:

```bash
POST /api/messages/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    {
      "activityType": "chat",
      "content": "First message",
      "teamId": "team-uuid",
      "metadata": {"source": "slack"}
    },
    {
      "activityType": "code",
      "content": "Second message",
      "teamId": "team-uuid",
      "metadata": {"file": "app.ts"}
    }
  ]
}
```

**Response:**
```json
{
  "message": "50 messages received and queued for processing",
  "count": 50,
  "processed": false
}
```

### 3. Get Processing Stats

```bash
GET /api/messages/stats?teamId=<optional-team-id>
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 1000,
  "processed": 850,
  "unprocessed": 150,
  "processingRate": 85.0,
  "oldestUnprocessed": "2025-12-13T10:00:00.000Z"
}
```

### 4. Check Queue Status

```bash
GET /api/processing/queue
Authorization: Bearer <token>
```

**Response:**
```json
{
  "unprocessedCount": 150,
  "status": "pending"
}
```

### 5. Manually Trigger Processing (Admin Only)

```bash
POST /api/processing/trigger?batchSize=100&limit=10000
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `batchSize` (default: 100) - Number of items to process per batch
- `limit` (default: 10000) - Maximum total items to process
- `teamId` (optional) - Process only specific team's messages

**Response:**
```json
{
  "message": "Batch processing completed",
  "result": {
    "total": 150,
    "processed": 150,
    "failed": 0,
    "errors": []
  }
}
```

## Scheduled Processing

The batch processor runs automatically on a schedule configured in `services/scheduler.ts`.

### Default Schedule

**Daily at 2:00 AM:**
```typescript
cron.schedule('0 2 * * *', async () => {
  await processPendingActivities(100, 50000);
});
```

### Available Schedules

Uncomment in `services/scheduler.ts` to change:

```typescript
// Every 5 minutes (testing only):
'*/5 * * * *'

// Every 30 minutes:
'*/30 * * * *'

// Every hour:
'0 * * * *'

// Every 6 hours:
'0 */6 * * *'

// Twice daily (2 AM and 2 PM):
'0 2,14 * * *'

// Every Monday at midnight:
'0 0 * * 1'
```

## How It Works

### Step 1: Message Ingestion
```
Client → POST /api/messages → PostgreSQL (processed: false)
                            ↓
                     Response (instant)
```

### Step 2: Scheduled Processing
```
Cron Job → Find unprocessed activities
        ↓
    Batch them (e.g., 100 at a time)
        ↓
    Generate embeddings (OpenAI batch API)
        ↓
    Store in Qdrant
        ↓
    Mark as processed in PostgreSQL
```

### Step 3: Semantic Search
```
User → Search query → Generate embedding
                   ↓
            Qdrant similarity search
                   ↓
       Fetch full data from PostgreSQL
                   ↓
            Return results
```

## Code Architecture

```
backend/
├── controllers/
│   ├── messageController.ts       # Ingest endpoints
│   └── processingController.ts    # Processing triggers
├── services/
│   ├── embeddingService.ts        # OpenAI embeddings
│   ├── vectorService.ts           # Qdrant operations
│   ├── batchProcessor.ts          # Batch processing logic
│   └── scheduler.ts               # Cron jobs
├── routes/
│   ├── messageRoutes.ts           # /api/messages
│   └── processingRoutes.ts        # /api/processing
└── server.ts                      # Initialize scheduler
```

## Usage Examples

### Example 1: Browser Extension Sending Activity

```javascript
// Browser extension sends messages periodically
async function sendActivity(activity) {
  const response = await fetch('http://localhost:5000/api/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      activityType: 'code',
      content: activity.code,
      teamId: userTeamId,
      metadata: {
        file: activity.fileName,
        language: activity.language,
        linesAdded: activity.linesAdded
      }
    })
  });

  // Returns immediately, no waiting for embedding
  return response.json();
}
```

### Example 2: Bulk Upload Historical Data

```javascript
// Upload 1000s of historical messages quickly
const messages = [
  { activityType: 'chat', content: 'Message 1', teamId: 'team-id' },
  { activityType: 'chat', content: 'Message 2', teamId: 'team-id' },
  // ... thousands more
];

// Batch them in chunks of 100
for (let i = 0; i < messages.length; i += 100) {
  const batch = messages.slice(i, i + 100);

  await fetch('http://localhost:5000/api/messages/batch', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messages: batch })
  });

  // Small delay to avoid rate limits
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Then manually trigger processing (if admin)
await fetch('http://localhost:5000/api/processing/trigger', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

### Example 3: Monitor Processing

```javascript
// Check how many messages are waiting
const stats = await fetch('http://localhost:5000/api/messages/stats', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log(`Unprocessed: ${stats.unprocessed}`);
console.log(`Processing rate: ${stats.processingRate}%`);
console.log(`Oldest unprocessed: ${stats.oldestUnprocessed}`);
```

## Testing

### Test Script

```bash
# Create test script
cat > test-pipeline.sh << 'EOF'
#!/bin/bash

BASE_URL="http://localhost:5000/api"

# Login
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.token')

TEAM_ID="00000000-0000-0000-0000-000000000001"

echo "1. Ingesting single message..."
curl -s -X POST "$BASE_URL/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"activityType\": \"chat\",
    \"content\": \"Discussed OAuth implementation strategy\",
    \"teamId\": \"$TEAM_ID\"
  }" | jq

echo -e "\n2. Ingesting batch of messages..."
curl -s -X POST "$BASE_URL/messages/batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"messages\": [
      {\"activityType\": \"code\", \"content\": \"Implemented JWT auth\", \"teamId\": \"$TEAM_ID\"},
      {\"activityType\": \"chat\", \"content\": \"Reviewed PR #123\", \"teamId\": \"$TEAM_ID\"},
      {\"activityType\": \"code\", \"content\": \"Fixed bug in login flow\", \"teamId\": \"$TEAM_ID\"}
    ]
  }" | jq

echo -e "\n3. Checking stats..."
curl -s -X GET "$BASE_URL/messages/stats" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n4. Checking queue status..."
curl -s -X GET "$BASE_URL/processing/queue" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n5. Manually triggering processing (requires admin)..."
curl -s -X POST "$BASE_URL/processing/trigger" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n6. Checking stats after processing..."
curl -s -X GET "$BASE_URL/messages/stats" \
  -H "Authorization: Bearer $TOKEN" | jq

EOF

chmod +x test-pipeline.sh
./test-pipeline.sh
```

## Monitoring & Operations

### Check Processing Logs

The batch processor logs everything:
```
[Batch Processor] Starting batch processing...
[Batch Processor] Batch size: 100, Limit: 10000
[Batch Processor] Found 500 unprocessed activities
[Batch Processor] Processing batch 1 (100 items)
[Batch Processor] Processing batch 2 (100 items)
...
[Batch Processor] Completed!
[Batch Processor] Processed: 500, Failed: 0
```

### Error Handling

If embedding fails for a batch:
- Error is logged
- Failed count is tracked
- Activities remain unprocessed
- Next run will retry them

### Manual Processing

For urgent processing:
```bash
# Process immediately (admin only)
curl -X POST "http://localhost:5000/api/processing/trigger?batchSize=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Performance Considerations

### Batch Sizes

- **Small batches (50-100)**: More reliable, easier to debug
- **Large batches (500-1000)**: Faster overall, but harder to recover from errors

### Rate Limits

OpenAI has rate limits:
- text-embedding-3-small: ~3,000 requests/min
- With batch size 100, you can process ~300,000 items/min

The processor includes 1-second delays between batches to avoid hitting limits.

### Cost Estimation

With text-embedding-3-small:
- 1000 messages (~100 words each) = ~150,000 tokens
- Cost: ~$0.003
- 1 million messages/day ≈ $3/day

## Two Pipelines Comparison

| Feature | Immediate (`/api/activities`) | Buffered (`/api/messages`) |
|---------|------------------------------|---------------------------|
| **Speed** | Slower (waits for embedding) | Fast (instant response) |
| **Use Case** | Low volume, real-time needs | High volume, can wait |
| **Cost** | Individual API calls | Batch API (cheaper) |
| **Search** | Immediately searchable | Searchable after processing |
| **Reliability** | Immediate error feedback | Retry-friendly |

## Best Practices

1. **Use buffered pipeline for:**
   - Browser extensions tracking activity
   - Bulk imports
   - High-frequency logging
   - Background data collection

2. **Use immediate pipeline for:**
   - Real-time features
   - User-initiated actions
   - When immediate search is needed

3. **Monitoring:**
   - Check `/api/messages/stats` regularly
   - Alert if unprocessed count grows too large
   - Monitor processing job logs

4. **Scheduling:**
   - Daily processing for most use cases
   - Hourly if you need fresher data
   - Consider timezone for 2 AM scheduling

## Troubleshooting

### Messages not processing
- Check scheduler is initialized: Look for "Scheduled job initialized" in logs
- Verify OpenAI API key is valid
- Check Qdrant connection
- Manually trigger: `POST /api/processing/trigger`

### High unprocessed count
- Increase batch size in cron job
- Run processing more frequently
- Check for API rate limit errors

### Processing failures
- Review `[Batch Processor]` logs
- Check errors array in trigger response
- Verify embedding service is working
