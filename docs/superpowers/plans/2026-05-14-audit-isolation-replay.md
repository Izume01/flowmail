# Production Audit Remediation - Data Isolation & Replay Protection

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure the database against cross-tenant data leakage and prevent webhook replay attacks.

**Architecture:** 
- Add timestamps to Webhook HMAC signatures (`t=...,v1=...`).
- Create a strict Data Access Layer (DAL) to ensure `project_id` is always enforced, mitigating the risk of service role key leaks.

**Tech Stack:** Bun, Hono, Node `crypto`, Supabase.

---

### Task 1: Webhook Replay Protection

**Files:**
- Modify: `flowmail/packages/shared/src/crypto.ts`
- Modify: `flowmail/apps/api/src/services/webhooks.ts`
- Modify: `flowmail/packages/sdk-node/src/index.ts`

- [ ] **Step 1: Update signature utility**

```typescript
// flowmail/packages/shared/src/crypto.ts
import * as crypto from 'crypto';

export function generateWebhookSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

export function verifyWebhookSignature(payload: string, header: string, secret: string, tolerance: number = 300): boolean {
  const parts = header.split(',');
  const tPart = parts.find(p => p.startsWith('t='));
  const v1Part = parts.find(p => p.startsWith('v1='));

  if (!tPart || !v1Part) return false;

  const timestamp = parseInt(tPart.substring(2), 10);
  const signature = v1Part.substring(3);

  if (isNaN(timestamp)) return false;

  // Check tolerance (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > tolerance) return false;

  const signaturePayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
}
```

- [ ] **Step 2: Apply to Webhook Dispatcher**

```typescript
// flowmail/apps/api/src/services/webhooks.ts
import { generateWebhookSignature } from '@flowmail/shared';
// ... inside dispatchWebhookEvent
const signature = generateWebhookSignature(JSON.stringify(payload), config.secret_key);
// ... pass as X-FlowMail-Signature
```

- [ ] **Step 3: Add verification to SDK**

```typescript
// flowmail/packages/sdk-node/src/index.ts
import { verifyWebhookSignature } from '@flowmail/shared';

export class FlowMail {
  // ...
  verifyWebhook(payload: string, signatureHeader: string, secret: string): boolean {
    return verifyWebhookSignature(payload, signatureHeader, secret);
  }
}
```

---

### Task 2: Strict Data Access Layer (DAL)

**Files:**
- Create: `flowmail/packages/db/src/dal.ts`
- Modify: `flowmail/packages/db/src/index.ts`

- [ ] **Step 1: Create DAL wrapper**

```typescript
// flowmail/packages/db/src/dal.ts
import { SupabaseClient } from '@supabase/supabase-js';

export class TenantDB {
  constructor(private supabase: SupabaseClient, private projectId: string) {}

  async getEmail(emailId: string) {
    return this.supabase.from('emails').select('*').eq('project_id', this.projectId).eq('id', emailId).single();
  }

  async insertEmail(data: any) {
    return this.supabase.from('emails').insert({ ...data, project_id: this.projectId }).select().single();
  }

  async updateEmailStatus(emailId: string, status: string) {
    return this.supabase.from('emails').update({ status }).eq('project_id', this.projectId).eq('id', emailId);
  }
  
  // Add other necessary methods (e.g., getFlows, insertIdempotencyKey)
}
```

- [ ] **Step 2: Export DAL**
Export `TenantDB` from `flowmail/packages/db/src/index.ts`.

---

### Task 3: Refactor API to use DAL

**Files:**
- Modify: `flowmail/apps/api/src/routes/emails.ts`

- [ ] **Step 1: Replace direct Supabase calls**
Update `emails.ts` to instantiate `TenantDB` using `c.get('projectId')` and use its methods to ensure tenant isolation is strictly enforced.
