# Production Audit Remediation - Immediate Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address the critical security and reliability vulnerabilities identified in the production audit.

**Architecture:** 
- Add HMAC signing to tracking URLs.
- Implement egress filtering for webhooks.
- Add rate limiting to public API endpoints.
- Implement idempotency keys in workflow executions.

**Tech Stack:** Bun, Hono, Node `crypto`, `@hono/rate-limit`.

---

### Task 1: Secure Click Tracking (Open Redirect Fix)

**Files:**
- Create: `flowmail/packages/shared/src/crypto.ts`
- Modify: `flowmail/packages/shared/src/index.ts`
- Modify: `flowmail/apps/api/src/routes/track.ts`

- [ ] **Step 1: Implement URL signing utility**

```typescript
// flowmail/packages/shared/src/crypto.ts
import * as crypto from 'crypto';

export function signUrl(url: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(url).digest('hex');
}

export function verifyUrlSignature(url: string, signature: string, secret: string): boolean {
  const expected = signUrl(url, secret);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

- [ ] **Step 2: Export from shared**
Export the crypto functions from `flowmail/packages/shared/src/index.ts`.

- [ ] **Step 3: Enforce signature on tracking route**

```typescript
// flowmail/apps/api/src/routes/track.ts
import { verifyUrlSignature } from '@flowmail/shared';
// ...
track.get('/click', async (c) => {
  const { url, emailId, sig } = c.req.query();
  if (!url || !sig) return c.text('Bad Request', 400);

  const secret = process.env.URL_SIGNING_SECRET || 'default_dev_secret';
  if (!verifyUrlSignature(url, sig, secret)) {
    return c.text('Invalid Signature', 403);
  }
  // ... proceed with redirect
});
```

---

### Task 2: SSRF Protection for Webhooks

**Files:**
- Modify: `flowmail/apps/api/src/services/webhooks.ts`

- [ ] **Step 1: Implement IP blocking logic**

```typescript
// flowmail/apps/api/src/services/webhooks.ts
import * as dns from 'dns/promises';

async function isSafeUrl(targetUrl: string): Promise<boolean> {
  try {
    const urlObj = new URL(targetUrl);
    // Basic local check
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') return false;

    // Resolve IP
    const records = await dns.resolve4(urlObj.hostname);
    for (const ip of records) {
      // Very basic private IP check (extend as needed)
      if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.') || ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}
```

- [ ] **Step 2: Apply to dispatcher**
Before calling `fetch(config.url, ...)`, ensure `isSafeUrl(config.url)` is true. If false, log a delivery failure and continue.

---

### Task 3: API Rate Limiting

**Files:**
- Modify: `flowmail/apps/api/package.json`
- Modify: `flowmail/apps/api/src/index.ts`

- [x] **Step 1: Install rate limiter**
Run `cd flowmail/apps/api && bun add hono-rate-limiter`

- [x] **Step 2: Configure limiter globally**

```typescript
// flowmail/apps/api/src/index.ts
import { rateLimiter } from 'hono-rate-limiter';

const limiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: "draft-6",
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'global',
});

// Apply to specific high-risk routes or globally
app.use('/emails/*', limiter);
app.use('/track/*', limiter);
```

---

### Task 4: Workflow Idempotency

**Files:**
- Modify: `flowmail/packages/db/src/schema.sql`
- Modify: `flowmail/apps/api/src/routes/workflows.ts`

- [ ] **Step 1: Create idempotency table**

```sql
-- flowmail/packages/db/src/schema.sql
CREATE TABLE idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Implement check before SES send**

```typescript
// flowmail/apps/api/src/routes/workflows.ts
// Inside the send_email node logic:
const idempotencyKey = `flow_${flowId}_node_${node.id}_exec_${executionId}`;

const { error: idempError } = await supabase
  .from('idempotency_keys')
  .insert({ idempotency_key: idempotencyKey });

if (idempError) {
  // If constraint violation, we already sent this!
  console.log(`Skipping duplicate send for key ${idempotencyKey}`);
  return; // skip SES call
}

// ... proceed to call SES
```
