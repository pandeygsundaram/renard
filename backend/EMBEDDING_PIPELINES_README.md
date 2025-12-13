# Text Embedding & Vector Storage Pipelines

DevTrack AI provides **two pipelines** for storing activities with text embeddings:

## 1. Immediate Processing Pipeline (`/api/activities`)
Fast, real-time embedding generation for low-volume, user-initiated actions.

## 2. Buffered Processing Pipeline (`/api/messages`)
High-performance message ingestion with scheduled batch processing.

---

## Quick Comparison

| Feature | Immediate Pipeline | Buffered Pipeline |
|---------|-------------------|-------------------|
| **Endpoint** | `POST /api/activities` | `POST /api/messages` |
| **Processing** | Immediate | Scheduled (e.g., every 24h) |
| **Response Time** | ~1-2 seconds | ~50ms |
| **Cost** | Higher (individual calls) | Lower (batch processing) |
| **Search Availability** | Immediate | After batch job runs |
| **Best For** | User actions, low volume | Background tracking, high volume |
| **Batch Support** | No | Yes (`/api/messages/batch`) |
| **Error Recovery** | Immediate feedback | Retry-friendly |

---

## Pipeline 1: Immediate Processing

### Use Cases
- ✅ User creates activity manually
- ✅ Real-time features requiring instant search
- ✅ Low volume (< 1000/day)
- ✅ When immediate feedback is needed

### How It Works
```
Client Request
    ↓
Store in PostgreSQL (processed: false)
    ↓
Generate embedding via OpenAI ← ~1-2 sec
    ↓
Store vector in Qdrant
    ↓
Update PostgreSQL (processed: true, vectorId: xxx)
    ↓
Return to client
```

### Example
```bash
curl -X POST http://localhost:5000/api/activities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityType": "code",
    "content": "Implemented OAuth2 authentication flow",
    "teamId": "team-uuid",
    "metadata": {"file": "auth.ts"}
  }'
```

**Response (after ~1-2 seconds):**
```json
{
  "message": "Activity created and embedded successfully",
  "activity": {
    "id": "uuid",
    "vectorId": "uuid",
    "processed": true,
    ...
  }
}
```

### Endpoints
- `POST /api/activities` - Create with immediate embedding
- `GET /api/activities` - List all activities
- `GET /api/activities/search?query=X` - Semantic search
- `GET /api/activities/:id` - Get specific activity

📖 **Full Documentation:** [ACTIVITY_API_DOCS.md](./ACTIVITY_API_DOCS.md)

---

## Pipeline 2: Buffered Processing

### Use Cases
- ✅ Browser extension tracking code changes
- ✅ Bulk imports of historical data
- ✅ High-frequency logging (thousands/day)
- ✅ Background data collection
- ✅ When immediate search isn't required

### How It Works
```
┌─────────────────────────────────────────────┐
│ Phase 1: Fast Ingestion (50ms)             │
└─────────────────────────────────────────────┘
Client Request
    ↓
Store in PostgreSQL (processed: false)
    ↓
Return to client immediately ← ~50ms


┌─────────────────────────────────────────────┐
│ Phase 2: Scheduled Processing (async)      │
└─────────────────────────────────────────────┘
Cron Job (e.g., 2 AM daily)
    ↓
Find all unprocessed activities
    ↓
Group into batches (e.g., 100 items)
    ↓
Generate embeddings (batch API)
    ↓
Store vectors in Qdrant (batch)
    ↓
Update PostgreSQL (processed: true)
```

### Example: Single Message
```bash
curl -X POST http://localhost:5000/api/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityType": "chat",
    "content": "Discussed implementing rate limiting",
    "teamId": "team-uuid"
  }'
```

**Response (instant):**
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

### Example: Batch Upload
```bash
curl -X POST http://localhost:5000/api/messages/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"activityType": "code", "content": "Message 1", "teamId": "team-uuid"},
      {"activityType": "chat", "content": "Message 2", "teamId": "team-uuid"},
      // ... up to 100s or 1000s
    ]
  }'
```

### Scheduled Processing

**Default:** Runs daily at 2:00 AM
```typescript
// services/scheduler.ts
cron.schedule('0 2 * * *', async () => {
  await processPendingActivities(100, 50000);
});
```

**Available schedules:**
- `*/5 * * * *` - Every 5 minutes (testing)
- `*/30 * * * *` - Every 30 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours
- `0 2,14 * * *` - Twice daily (2 AM & 2 PM)

### Manual Trigger (Admin Only)
```bash
# Process immediately without waiting for schedule
curl -X POST "http://localhost:5000/api/processing/trigger?batchSize=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Monitoring
```bash
# Check how many messages are waiting
curl -X GET http://localhost:5000/api/messages/stats \
  -H "Authorization: Bearer $TOKEN"
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

### Endpoints
- `POST /api/messages` - Ingest single message (fast)
- `POST /api/messages/batch` - Ingest multiple messages
- `GET /api/messages/stats` - Processing statistics
- `GET /api/processing/queue` - Queue status
- `POST /api/processing/trigger` - Manual trigger (admin)

📖 **Full Documentation:** [MESSAGE_PIPELINE_DOCS.md](./MESSAGE_PIPELINE_DOCS.md)

---

## Decision Guide

### Use Immediate Pipeline When:
- 🎯 User is actively waiting for the result
- 🎯 Need immediate semantic search
- 🎯 Low volume (< 1000 items/day)
- 🎯 Real-time features
- 🎯 Interactive applications

### Use Buffered Pipeline When:
- 📦 Background data collection
- 📦 Browser extensions tracking activity
- 📦 High volume (> 1000 items/day)
- 📦 Bulk imports
- 📦 Don't need immediate search
- 📦 Want to optimize costs

---

## Cost Comparison

**OpenAI text-embedding-3-small pricing:** ~$0.02 per 1M tokens

### Immediate Pipeline
- 1000 activities (~100 words each) = 150K tokens
- Cost: ~$0.003
- **$3 per million items**

### Buffered Pipeline (Batch)
- Same 1000 activities
- Batch API often has discounts
- More efficient API usage
- **~$2-2.5 per million items**

### Additional Benefits of Batching:
- Reduced API overhead
- Better rate limit utilization
- Retry entire batches on failure
- More predictable costs

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Client Apps                      │
│  (Web, Browser Extension, CLI, Mobile)            │
└──────────────────────────────────────────────────┘
           │                           │
           │ High Volume               │ Low Volume
           │ Background                │ Interactive
           ↓                           ↓
    ┌──────────────┐          ┌─────────────────┐
    │   /messages  │          │  /activities    │
    │  (Buffered)  │          │  (Immediate)    │
    └──────────────┘          └─────────────────┘
           │                           │
           ↓                           ↓
    ┌──────────────────────────────────────────┐
    │         PostgreSQL Database              │
    │  (activities table with processed flag)  │
    └──────────────────────────────────────────┘
           │                           │
    Batch Processor              Immediate
    (Scheduled)                  Processing
           │                           │
           ↓                           ↓
    ┌──────────────────────────────────────────┐
    │          OpenAI Embeddings               │
    │     (text-embedding-3-small)             │
    └──────────────────────────────────────────┘
           │                           │
           ↓                           ↓
    ┌──────────────────────────────────────────┐
    │          Qdrant Vector DB                │
    │    (activities & worklogs collections)   │
    └──────────────────────────────────────────┘
                      ↓
           ┌────────────────────┐
           │  Semantic Search   │
           └────────────────────┘
```

---

## Testing

### Test Immediate Pipeline
```bash
./test-activity-api.sh
```

### Test Buffered Pipeline
```bash
./test-pipeline.sh
```

### Manual Testing
```bash
# 1. Start server
npm run dev

# 2. In another terminal, run tests
./test-pipeline.sh
```

---

## Configuration

### Environment Variables
```env
# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Qdrant
QDRANT_URL=https://your-instance.cloud.qdrant.io:6333
QDRANT_API_KEY=your-qdrant-key

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

### Batch Processing Schedule

Edit `services/scheduler.ts` to change schedule:
```typescript
// Daily at 2 AM (default)
cron.schedule('0 2 * * *', async () => {
  await processPendingActivities(100, 50000);
});

// Or hourly
cron.schedule('0 * * * *', async () => {
  await processPendingActivities(100, 10000);
});
```

### Batch Size Tuning

Adjust in batch processor or trigger:
```bash
# Smaller batches (more reliable)
POST /api/processing/trigger?batchSize=50

# Larger batches (faster)
POST /api/processing/trigger?batchSize=500
```

---

## Common Workflows

### Workflow 1: Browser Extension
```javascript
// Extension tracks code changes (buffered)
async function trackCodeChange(code) {
  await fetch('http://localhost:5000/api/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      activityType: 'code',
      content: code,
      teamId: userTeamId
    })
  });
  // Returns instantly, no waiting
}
```

### Workflow 2: User Creates Manual Entry
```javascript
// User submits form (immediate)
async function createActivity(data) {
  const response = await fetch('http://localhost:5000/api/activities', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  // Show "searching..." for ~1-2 sec
  const result = await response.json();

  // Now immediately searchable
  searchActivities(data.content);
}
```

### Workflow 3: Bulk Import
```javascript
// Import historical data (buffered batch)
const messages = loadHistoricalData(); // 10,000 items

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
}

// Then trigger processing
await fetch('http://localhost:5000/api/processing/trigger', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

---

## Troubleshooting

### Messages not being processed
1. Check scheduler initialized: `✓ Scheduled job initialized` in logs
2. Verify cron schedule in `services/scheduler.ts`
3. Manually trigger: `POST /api/processing/trigger`
4. Check OpenAI API key is valid

### Slow ingestion
- Use `/api/messages/batch` instead of individual requests
- Consider increasing batch size in requests
- Check network latency

### High unprocessed count
- Run processing more frequently (edit scheduler)
- Increase batch size in processor
- Add more processing capacity

### Search not finding results
- Verify processing completed: Check `/api/messages/stats`
- Ensure `processed: true` in database
- Check Qdrant collection exists and has data

---

## Performance Tips

1. **For high volume:** Use buffered pipeline with batch endpoint
2. **Batch size:** 100-500 items per batch for best performance
3. **Schedule:** Daily for most use cases, hourly if needed
4. **Monitoring:** Track `/api/messages/stats` regularly
5. **Rate limits:** 1-second delay between batches prevents OpenAI throttling

---

## Next Steps

1. ✅ Both pipelines are ready to use
2. 🔜 Add team management endpoints
3. 🔜 Implement WorkLog embeddings
4. 🔜 Add advanced search filters
5. 🔜 Build admin dashboard

---

## Need Help?

- Immediate Pipeline: See [ACTIVITY_API_DOCS.md](./ACTIVITY_API_DOCS.md)
- Buffered Pipeline: See [MESSAGE_PIPELINE_DOCS.md](./MESSAGE_PIPELINE_DOCS.md)
- Run tests: `./test-activity-api.sh` or `./test-pipeline.sh`
