#!/bin/bash

BASE_URL="http://localhost:5000/api"

echo "=== DevTrack AI Activity API Test ==="
echo ""

# Step 1: Register a test user
echo "1. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }')

echo "$REGISTER_RESPONSE" | jq '.'
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')

if [ "$TOKEN" = "null" ]; then
  echo "Registration failed. User might already exist. Trying login..."

  # Try login instead
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "password123"
    }')

  echo "$LOGIN_RESPONSE" | jq '.'
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
fi

echo ""
echo "Auth Token: $TOKEN"
echo ""

# Step 2: Get user profile to get user ID and create a team
echo "2. Getting user profile..."
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "$PROFILE_RESPONSE" | jq '.'
USER_ID=$(echo "$PROFILE_RESPONSE" | jq -r '.user.id')
echo ""

# For testing, we'll use a dummy team ID (you should create a team first in production)
# Let's assume you have a team or create one
TEAM_ID="00000000-0000-0000-0000-000000000001"

echo "3. Creating activity with text embedding..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/activities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"activityType\": \"code\",
    \"content\": \"Implemented user authentication using JWT tokens with bcrypt password hashing. Added middleware for protected routes.\",
    \"teamId\": \"$TEAM_ID\",
    \"metadata\": {
      \"file\": \"authController.ts\",
      \"language\": \"typescript\",
      \"linesAdded\": 150
    }
  }")

echo "$CREATE_RESPONSE" | jq '.'
ACTIVITY_ID=$(echo "$CREATE_RESPONSE" | jq -r '.activity.id')
echo ""

echo "4. Creating another activity..."
curl -s -X POST "$BASE_URL/activities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"activityType\": \"code\",
    \"content\": \"Built REST API endpoint for activity tracking with Qdrant vector database integration. Supports semantic search.\",
    \"teamId\": \"$TEAM_ID\",
    \"metadata\": {
      \"file\": \"activityController.ts\",
      \"language\": \"typescript\",
      \"linesAdded\": 200
    }
  }" | jq '.'

echo ""

echo "5. Creating a chat activity..."
curl -s -X POST "$BASE_URL/activities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"activityType\": \"chat\",
    \"content\": \"Discussed implementing OAuth 2.0 authentication flow for third-party integrations.\",
    \"teamId\": \"$TEAM_ID\",
    \"metadata\": {
      \"source\": \"slack\",
      \"channel\": \"engineering\"
    }
  }" | jq '.'

echo ""
echo "Waiting 2 seconds for embeddings to be processed..."
sleep 2

echo ""
echo "6. Getting all activities..."
curl -s -X GET "$BASE_URL/activities?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "7. Searching for similar activities (semantic search)..."
curl -s -X GET "$BASE_URL/activities/search?query=authentication%20implementation&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "8. Getting specific activity by ID..."
curl -s -X GET "$BASE_URL/activities/$ACTIVITY_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "=== Test Complete ==="
