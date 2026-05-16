# Audience Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the database schema and API endpoints for the Audience Engine (Contacts and Custom Events).

**Architecture:**
- Supabase schema for `contacts` and `user_events`.
- Hono API router `/audience` with `/identify` and `/track` endpoints.
- Types and SDK updates.

---

### Task 1: Shared Schemas

**Files:**
- Modify: `flowmail/packages/shared/src/schemas.ts`

- [ ] **Step 1: Define Identify and Track schemas**

```typescript
// flowmail/packages/shared/src/schemas.ts
import { z } from 'zod';

export const identifySchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  attributes: z.record(z.any()).optional(),
});

export const trackSchema = z.object({
  email: z.string().email(),
  event: z.string().min(1),
  properties: z.record(z.any()).optional(),
});

export type IdentifyRequest = z.infer<typeof identifySchema>;
export type TrackRequest = z.infer<typeof trackSchema>;
```

---

### Task 2: Database Schema & DAL

**Files:**
- Modify: `flowmail/packages/db/src/schema.sql`
- Modify: `flowmail/packages/db/src/dal.ts`

- [ ] **Step 1: Add audience tables**

```sql
-- flowmail/packages/db/src/schema.sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, email)
);

CREATE TABLE user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Add DAL methods**

```typescript
// flowmail/packages/db/src/dal.ts
// Add methods to TenantDB:
// - upsertContact(email, firstName, lastName, attributes)
// - insertUserEvent(contactId, eventName, properties)
```
*Note: For `upsertContact`, use the Supabase `.upsert()` method matching on `(project_id, email)`. Be careful to merge attributes if possible, or just overwrite for the MVP.*

---

### Task 3: Collector API

**Files:**
- Create: `flowmail/apps/api/src/routes/audience.ts`
- Modify: `flowmail/apps/api/src/index.ts`

- [ ] **Step 1: Implement `/identify`**
Use `tenantDb.upsertContact`.

- [ ] **Step 2: Implement `/track`**
Find or create the contact using `tenantDb.upsertContact` (with just email if new), then `tenantDb.insertUserEvent`.
*Bonus: Call the Upstash Workflow trigger logic here if flows are listening to `event_name`.*

- [ ] **Step 3: Mount router**
Mount `audience` at `/audience` in `index.ts`.

---

### Task 4: SDK Updates

**Files:**
- Modify: `flowmail/packages/sdk-node/src/index.ts`

- [ ] **Step 1: Add `identify` and `track` methods**

```typescript
// flowmail/packages/sdk-node/src/index.ts
  async identify(payload: IdentifyRequest): Promise<any> {
    return this.request('/audience/identify', { method: 'POST', body: JSON.stringify(payload) });
  }

  async track(payload: TrackRequest): Promise<any> {
    return this.request('/audience/track', { method: 'POST', body: JSON.stringify(payload) });
  }
```
