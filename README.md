# FlowMail

Professional transactional email API and dashboard.

## Monorepo Structure

- `apps/api`: Hono-based API for sending emails.
- `apps/web`: Next.js dashboard for viewing logs and testing sends.
- `packages/shared`: Shared Zod schemas and types.
- `packages/db`: Database client and schema (Supabase).
- `packages/email`: Email service layer (AWS SES).

## Prerequisites

- [Bun](https://bun.sh)
- [Supabase](https://supabase.com) account and project.
- [AWS SES](https://aws.amazon.com/ses/) account and verified identity.

## Setup Instructions

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    bun install
    ```
3.  **Environment Variables:**
    Copy `.env.example` to `.env` (or set them in your environment):
    ```bash
    cp .env.example .env
    ```
    Fill in your Supabase and AWS credentials.
4.  **Database Setup:**
    - Run `bun setup:db` to see the path to the SQL schema.
    - Copy the contents of `packages/db/src/schema.sql` and run it in your Supabase SQL Editor.

## Running the Project

Run both API and Web in development mode:
```bash
bun dev
```

Or run them individually:
```bash
bun dev:api
bun dev:web
```

## Testing

Run tests for all packages and apps:
```bash
bun test
```
