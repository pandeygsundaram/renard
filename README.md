# DevTrack AI

A productivity tracking platform for engineering teams that automatically captures, summarizes, and preserves developer work context from multiple sources.

## What It Does

DevTrack AI helps teams track and understand developer productivity by:

- **Capturing work context** from AI assistants (ChatGPT, Claude, Gemini), VS Code, and CLI tools
- **Generating AI-powered summaries** of daily/weekly work for each developer
- **Preserving institutional knowledge** to prevent information loss during transitions
- **Enabling semantic search** so new team members can query past implementations and decisions
- **Providing admin insights** with visual dashboards showing team productivity and contributions

## Tech Stack

**Backend:**
- Node.js + TypeScript + Express
- PostgreSQL (Supabase) + Prisma ORM 7
- Qdrant Vector Database
- JWT Authentication

**Planned:**
- Frontend: React/Next.js
- MCP Server for VS Code integration
- AI integrations (OpenAI/Anthropic APIs)

## Project Structure

```
devgraph/
├── backend/          # Express API server
└── frontend/         # (Coming soon) React dashboard
```

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase account)
- Qdrant cloud account

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file with:
```env
DATABASE_URL="your-postgres-url"
DIRECT_URL="your-postgres-direct-url"
QDRANT_URL="your-qdrant-url"
QDRANT_API_KEY="your-qdrant-key"
JWT_SECRET="your-secret-key"
```

Run migrations and start:
```bash
npm run prisma:migrate
npm run dev
```

Server runs at `http://localhost:3000`

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile

## Features Roadmap

- [x] User authentication
- [x] Database schema
- [x] Vector database connection
- [ ] Activity collection endpoints
- [ ] Embedding generation service
- [ ] Admin dashboard
- [ ] VS Code MCP server
- [ ] AI chat integrations
- [ ] CLI tracking tool
- [ ] Semantic search
- [ ] Work summaries

## Contributing

Built for a hackathon. Contributions welcome!
