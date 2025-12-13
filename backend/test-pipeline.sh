#!/bin/bash

BASE_URL="http://localhost:5000/api"

echo "=== DevTrack AI - Message Processing Pipeline Test ==="
echo ""

# Login
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" = "null" ]; then
  echo "Login failed. Please register first or check credentials."
  exit 1
fi

TEAM_ID="00000000-0000-0000-0000-000000000001"

echo ""
echo "2. Ingesting single message (buffered, no processing yet)..."
curl -s -X POST "$BASE_URL/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"activityType\": \"chat\",
    \"content\": \"Discussed OAuth2 authentication implementation strategy with the team\",
    \"teamId\": \"$TEAM_ID\",
    \"metadata\": {
      \"source\": \"slack\",
      \"channel\": \"engineering\"
    }
  }" | jq

echo ""
echo "3. Ingesting batch of messages..."
curl -s -X POST "$BASE_URL/messages/batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"messages\": [
      {
        \"activityType\": \"code\",
        \"content\": \"Implemented JWT authentication with refresh token rotation\",
        \"teamId\": \"$TEAM_ID\",
        \"metadata\": {\"file\": \"authController.ts\", \"linesAdded\": 150}
      },
      {
        \"activityType\": \"chat\",
        \"content\": \"Reviewed pull request #123 for database migration changes\",
        \"teamId\": \"$TEAM_ID\",
        \"metadata\": {\"source\": \"github\", \"pr\": 123}
      },
      {
        \"activityType\": \"code\",
        \"content\": \"Fixed critical bug in login flow causing session timeouts\",
        \"teamId\": \"$TEAM_ID\",
        \"metadata\": {\"file\": \"session.ts\", \"bugId\": \"BUG-456\"}
      },
      {
        \"activityType\": \"chat\",
        \"content\": \"Discussed implementing rate limiting for API endpoints\",
        \"teamId\": \"$TEAM_ID\",
        \"metadata\": {\"source\": \"slack\"}
      },
      {
        \"activityType\": \"code\",
        \"content\": \"Added input validation middleware using express-validator\",
        \"teamId\": \"$TEAM_ID\",
        \"metadata\": {\"file\": \"middleware/validation.ts\"}
      }
    ]
  }" | jq

echo ""
echo "4. Checking processing statistics..."
STATS=$(curl -s -X GET "$BASE_URL/messages/stats" \
  -H "Authorization: Bearer $TOKEN")
echo "$STATS" | jq

UNPROCESSED=$(echo "$STATS" | jq -r '.unprocessed')
echo ""
echo "📊 Status: $UNPROCESSED messages waiting for processing"

echo ""
echo "5. Checking queue status..."
curl -s -X GET "$BASE_URL/processing/queue" \
  -H "Authorization: Bearer $TOKEN" | jq

echo ""
echo "6. Manually triggering batch processing..."
echo "(Note: This requires admin role. If you're not admin, this will fail.)"
PROCESS_RESULT=$(curl -s -X POST "$BASE_URL/processing/trigger?batchSize=50&limit=100" \
  -H "Authorization: Bearer $TOKEN")

echo "$PROCESS_RESULT" | jq

# Check if processing succeeded
SUCCESS=$(echo "$PROCESS_RESULT" | jq -r '.result.processed // 0')

if [ "$SUCCESS" -gt 0 ]; then
  echo ""
  echo "✅ Processing successful! $SUCCESS messages processed."

  echo ""
  echo "7. Checking stats after processing..."
  curl -s -X GET "$BASE_URL/messages/stats" \
    -H "Authorization: Bearer $TOKEN" | jq

  echo ""
  echo "8. Testing semantic search on processed messages..."
  curl -s -X GET "$BASE_URL/activities/search?query=authentication&limit=5" \
    -H "Authorization: Bearer $TOKEN" | jq

  echo ""
  echo "9. Getting all activities..."
  curl -s -X GET "$BASE_URL/activities?limit=10" \
    -H "Authorization: Bearer $TOKEN" | jq '.activities[].content'
else
  echo ""
  echo "⚠️  Processing failed or user is not admin."
  echo "Messages are still in the queue and will be processed by the scheduled job."
  echo ""
  echo "The batch processor runs daily at 2:00 AM by default."
  echo "You can modify the schedule in services/scheduler.ts"
fi

echo ""
echo "=== Pipeline Test Complete ==="
echo ""
echo "Pipeline Flow:"
echo "1. ✅ Messages ingested quickly (buffered)"
echo "2. ⏳ Waiting in queue (processed: false)"
echo "3. 🔄 Batch processor runs (scheduled or manual)"
echo "4. 🤖 Embeddings generated (OpenAI)"
echo "5. 💾 Stored in Qdrant (vector DB)"
echo "6. ✅ Marked as processed"
echo "7. 🔍 Available for semantic search"
echo ""
