# High-Scale Analytics Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace synchronous database writes on tracking endpoints with an asynchronous Redis-backed ingestion pipeline.

**Architecture:** 
- Tracking endpoints (`/track/open`, `/track/click`) push event JSON to an Upstash Redis List (`LPUSH`).
- A background worker (`analytics-worker`) pulls events in batches, aggregates them by `email_id`, and performs bulk SQL updates in Supabase.

**Tech Stack:** Bun, Hono, Upstash Redis, Supabase (Postgres).

---

### Task 1: Analytics Ingestion Service

**Files:**
- Create: `flowmail/apps/api/src/services/analytics.ts`
- Modify: `flowmail/apps/api/src/routes/track.ts`

- [x] **Step 1: Implement Redis producer**
- [x] **Step 2: Update tracking routes**
Modify `track.ts` to call `queueTrackingEvent` instead of `tenantDb.incrementOpens` or `tenantDb.incrementClicks`. The route should return the tracking pixel/redirect as fast as possible without waiting for DB.

---

### Task 2: Background Worker (Consumer)

**Files:**
- Create: `flowmail/apps/api/src/workers/analytics-worker.ts`
- Modify: `flowmail/apps/api/package.json`

- [x] **Step 1: Implement Batch Processor**

```typescript
// flowmail/apps/api/src/workers/analytics-worker.ts
import { Redis } from '@upstash/redis';
import { createDbClient } from '@flowmail/db';

const redis = new Redis({ ... });
const supabase = createDbClient(...);

async function processBatch() {
  const events = await redis.rpop('analytics_queue', 1000); // Pull up to 1000
  if (!events || events.length === 0) return;

  const aggregations: Record<string, { opens: number, clicks: number }> = {};

  for (const raw of events) {
    const event = JSON.parse(raw);
    if (!aggregations[event.emailId]) aggregations[event.emailId] = { opens: 0, clicks: 0 };
    if (event.type === 'open') aggregations[event.emailId].opens++;
    if (event.type === 'click') aggregations[event.emailId].clicks++;
  }

  // Perform bulk update in Supabase (using a new RPC or raw SQL)
  // For simplicity, we can loop for now, but a single bulk RPC is better for production.
  for (const [emailId, stats] of Object.entries(aggregations)) {
     await supabase.rpc('bulk_increment_stats', { 
       p_email_id: emailId, 
       p_opens: stats.opens, 
       p_clicks: stats.clicks 
     });
  }
}

// Run in a loop
setInterval(processBatch, 10000); // Every 10 seconds
```

---

### Task 3: Database Optimization (Bulk RPC)

**Files:**
- Modify: `flowmail/packages/db/src/schema.sql`

- [x] **Step 1: Add bulk increment RPC**

```sql
CREATE OR REPLACE FUNCTION bulk_increment_stats(p_email_id UUID, p_opens INTEGER, p_clicks INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE emails 
  SET 
    opens = opens + p_opens,
    clicks = clicks + p_clicks
  WHERE id = p_email_id;
END;
$$ LANGUAGE plpgsql;
```

---

### Task 4: Root Orchestration

- [x] **Step 1: Add `worker:analytics` script to `package.json`**
- [x] **Step 2: Update root `dev` script to include the worker.**
