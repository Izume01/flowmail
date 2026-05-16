# FlowMail

FlowMail is an AI-powered email marketing and automation platform.

## Architecture
- **apps/api**: Hono-based REST API and background worker.
- **apps/web**: Next.js dashboard.
- **packages/**: Shared logic for DB, Email, AI, and SDK.

## Setup
1. Copy `.env.example` to `.env` and fill in your credentials.
2. Run `bun install` to link the monorepo.
3. Apply the SQL in `packages/db/src/schema.sql` to your Supabase project.

## Running
- **All (API + Web + Worker)**: `bun dev`
- **Just API**: `bun dev:api`
- **Just Web**: `bun dev:web`

## Testing
`bun test`
