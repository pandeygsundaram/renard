# Activity API with Vector Embeddings

This API allows you to store activities (code, chat, commands) with automatic text embeddings for semantic search using Qdrant vector database.

## Features

- ✅ Create activities with automatic embedding generation
- ✅ Store embeddings in Qdrant vector database
- ✅ Semantic search for similar activities
- ✅ OpenAI text-embedding-3-small model (1536 dimensions)
- ✅ JWT authentication
- ✅ PostgreSQL database with Prisma ORM

## Setup

### 1. Environment Variables

Make sure your `.env` file has the following:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here

# Qdrant Vector Database
QDRANT_URL=https://your-qdrant-instance.cloud.qdrant.io:6333
QDRANT_API_KEY=your-qdrant-api-key
```

### 2. Start the Server

```bash
npm run dev
```

The server will:
- Connect to PostgreSQL database
- Connect to Qdrant
- Initialize vector collections (`activities`, `worklogs`)
- Start on port 5000

## API Endpoints

### Authentication

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response includes a JWT token:
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Activities

All activity endpoints require authentication. Include the JWT token in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

#### Create Activity with Embedding

```bash
POST /api/activities
Authorization: Bearer <token>
Content-Type: application/json

{
  "activityType": "code",
  "content": "Implemented user authentication using JWT tokens with bcrypt password hashing",
  "teamId": "team-uuid-here",
  "metadata": {
    "file": "authController.ts",
    "language": "typescript",
    "linesAdded": 150
  }
}
```

**Activity Types:**
- `code` - Code changes
- `chat` - Chat/discussion messages
- `command` - CLI commands executed

**Response:**
```json
{
  "message": "Activity created and embedded successfully",
  "activity": {
    "id": "uuid",
    "userId": "uuid",
    "teamId": "uuid",
    "activityType": "code",
    "content": "...",
    "metadata": { ... },
    "vectorId": "uuid",
    "processed": true,
    "timestamp": "2025-12-13T14:30:00.000Z"
  }
}
```

The API will:
1. Create the activity in PostgreSQL
2. Generate text embedding using OpenAI
3. Store the embedding in Qdrant with the activity ID
4. Return the activity with `vectorId` and `processed: true`

#### Get All Activities

```bash
GET /api/activities?limit=50&offset=0&teamId=<team-uuid>
Authorization: Bearer <token>
```

Query parameters:
- `limit` (optional, default: 50) - Number of activities to return
- `offset` (optional, default: 0) - Pagination offset
- `teamId` (optional) - Filter by team

#### Semantic Search

```bash
GET /api/activities/search?query=authentication%20implementation&limit=10
Authorization: Bearer <token>
```

Query parameters:
- `query` (required) - Search query text
- `limit` (optional, default: 10) - Number of results
- `teamId` (optional) - Filter by team

**Response:**
```json
{
  "query": "authentication implementation",
  "results": [
    {
      "score": 0.89,
      "activity": {
        "id": "uuid",
        "content": "Implemented user authentication using JWT tokens...",
        ...
      }
    }
  ],
  "count": 5
}
```

The score represents semantic similarity (0-1, higher is more similar).

#### Get Activity by ID

```bash
GET /api/activities/:id
Authorization: Bearer <token>
```

## How It Works

### Embedding Generation

When you create an activity:

1. **Activity Created** - Saved to PostgreSQL with `processed: false`
2. **Embedding Generated** - OpenAI generates a 1536-dimension vector from the content
3. **Vector Stored** - Embedding saved to Qdrant with metadata (userId, teamId, activityType, etc.)
4. **Activity Updated** - PostgreSQL activity updated with `vectorId` and `processed: true`

### Semantic Search

When you search:

1. **Query Embedded** - Your search query is converted to a vector
2. **Vector Search** - Qdrant finds similar vectors using cosine similarity
3. **Activities Retrieved** - Full activity details fetched from PostgreSQL
4. **Results Merged** - Activities returned with similarity scores

## Code Architecture

```
backend/
├── services/
│   ├── embeddingService.ts      # OpenAI embedding generation
│   └── vectorService.ts          # Qdrant operations
├── controllers/
│   └── activityController.ts    # Activity CRUD + search
├── routes/
│   ├── activityRoutes.ts        # Activity endpoints
│   └── index.ts                 # Main router
└── server.ts                    # Initialize collections on startup
```

## Testing

### Using the Test Script

```bash
# Make sure server is running
npm run dev

# In another terminal, run the test
./test-activity-api.sh
```

This will:
1. Register/login a test user
2. Create multiple activities with embeddings
3. List all activities
4. Perform semantic search
5. Get specific activity by ID

### Manual Testing with curl

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.token')

# 2. Create activity
curl -X POST http://localhost:5000/api/activities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityType": "code",
    "content": "Implemented OAuth2 authentication flow",
    "teamId": "your-team-id",
    "metadata": {"file": "auth.ts"}
  }' | jq

# 3. Search
curl -X GET "http://localhost:5000/api/activities/search?query=authentication&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Important Notes

### Team ID Requirement

Activities require a valid `teamId`. You need to either:
1. Create team management endpoints (recommended for production)
2. Manually insert a team in the database for testing

**Quick test team creation:**
```sql
INSERT INTO "Team" (id, name, type, "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Team', 'PERSONAL', NOW(), NOW());

INSERT INTO "TeamMember" (id, "userId", "teamId", role)
VALUES (gen_random_uuid(), '<your-user-id>', '00000000-0000-0000-0000-000000000001', 'OWNER');
```

### Error Handling

If embedding fails (e.g., invalid OpenAI API key):
- Activity is still created in the database
- `processed` remains `false`
- Response includes a warning message
- You can retry embedding later

### Cost Considerations

OpenAI text-embedding-3-small pricing:
- ~$0.02 per 1M tokens
- Average activity (~100 words) = ~150 tokens
- 1000 activities ≈ $0.003

## Next Steps

1. **Add Team Management** - Create endpoints for team CRUD operations
2. **Batch Embedding** - Process unembedded activities in background jobs
3. **WorkLog Embeddings** - Similar implementation for work summaries
4. **Advanced Search** - Filter by date ranges, activity types, etc.
5. **Analytics** - Track most similar activities, trending topics, etc.

## Troubleshooting

### "Failed to generate embedding"
- Check OpenAI API key is valid
- Ensure you have credits in your OpenAI account
- Check network connectivity

### "Qdrant connection warning"
- Verify QDRANT_URL and QDRANT_API_KEY
- Check Qdrant instance is running
- Verify network/firewall settings

### TypeScript errors
- Run `npm run prisma:generate` after schema changes
- Run `npm run build` to check for errors
