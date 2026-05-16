# Deliverability & Safety Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement AWS SES bounce/complaint handling, suppression list management, and list cleaning.

**Architecture:** 
- `POST /webhooks/ses` in `apps/api` for SNS ingestion.
- `suppressions` and `warmup_configs` tables in Supabase.
- Interceptor in email send route to block suppressed emails.

**Tech Stack:** Bun, Hono, Supabase, AWS SDK.

---

### Task 1: Database Schema & Supabase Functions

**Files:**
- Create: `flowmail/packages/db/src/deliverability.sql`
- Modify: `flowmail/packages/db/src/schema.sql`

- [ ] **Step 1: Define deliverability tables**

```sql
-- flowmail/packages/db/src/deliverability.sql

-- Suppression list
CREATE TABLE suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT NOT NULL, -- 'bounce', 'complaint', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, email)
);

-- IP Warmup tracking
CREATE TABLE warmup_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  daily_limit INTEGER NOT NULL DEFAULT 50,
  current_count INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Index for fast lookup
CREATE INDEX idx_suppressions_email ON suppressions(email);
```

- [ ] **Step 2: Add RPC for checking suppression**

```sql
CREATE OR REPLACE FUNCTION is_email_suppressed(p_project_id UUID, p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM suppressions 
    WHERE project_id = p_project_id AND email = p_email
  );
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 3: Commit**

```bash
git add flowmail/packages/db/
git commit -m "chore(db): add deliverability tables and suppression check RPC"
```

---

### Task 2: SES Webhook Handler (`apps/api`)

**Files:**
- Create: `flowmail/apps/api/src/routes/webhooks.ts`
- Modify: `flowmail/apps/api/src/index.ts`

- [ ] **Step 1: Implement Webhook Route**

```typescript
// flowmail/apps/api/src/routes/webhooks.ts
import { Hono } from 'hono';
import { createDbClient } from '@flowmail/db';

const webhooks = new Hono();

webhooks.post('/ses', async (c) => {
  const body = await c.req.json();
  const supabase = createDbClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Handle SNS SubscriptionConfirmation
  if (body.Type === 'SubscriptionConfirmation') {
    await fetch(body.SubscribeURL);
    return c.text('OK');
  }

  if (body.Type === 'Notification') {
    const msg = JSON.parse(body.Message);
    
    if (msg.notificationType === 'Bounce' && msg.bounce.bounceType === 'Permanent') {
      const email = msg.bounce.bouncedRecipients[0].emailAddress;
      await supabase.from('suppressions').upsert({
        email,
        reason: 'bounce'
      }, { onConflict: 'project_id,email' });
    }

    if (msg.notificationType === 'Complaint') {
      const email = msg.complaint.complainedRecipients[0].emailAddress;
      await supabase.from('suppressions').upsert({
        email,
        reason: 'complaint'
      }, { onConflict: 'project_id,email' });
    }
  }

  return c.text('OK');
});

export default webhooks;
```

- [ ] **Step 2: Register Webhook in API**

```typescript
// flowmail/apps/api/src/index.ts
import webhooks from './routes/webhooks';
// ...
app.route('/webhooks', webhooks);
```

---

### Task 3: Pre-Send Suppression Check

**Files:**
- Modify: `flowmail/apps/api/src/routes/emails.ts`

- [ ] **Step 1: Add suppression check to send route**

```typescript
// flowmail/apps/api/src/routes/emails.ts

// ... inside POST / ...
const { data: isSuppressed } = await supabase.rpc('is_email_suppressed', {
  p_project_id: projectId,
  p_email: body.to
});

if (isSuppressed) {
  return c.json({ error: 'Email is suppressed due to previous bounce/complaint' }, 403);
}
```

---

### Task 4: List Cleaning & Validation

**Files:**
- Create: `flowmail/packages/shared/src/validator.ts`
- Modify: `flowmail/packages/shared/src/index.ts`

- [ ] **Step 1: Implement advanced validator**

```typescript
// flowmail/packages/shared/src/validator.ts
export const isValidRecipient = (email: string): boolean => {
  const disposableDomains = ['mailinator.com', 'tempmail.com']; // Extend this list
  const domain = email.split('@')[1];
  return !disposableDomains.includes(domain);
};
```

- [ ] **Step 2: Add validation to send route**

```typescript
// flowmail/apps/api/src/routes/emails.ts
import { isValidRecipient } from '@flowmail/shared';

// ...
if (!isValidRecipient(body.to)) {
  return c.json({ error: 'Disposable email domains are not allowed' }, 400);
}
```
