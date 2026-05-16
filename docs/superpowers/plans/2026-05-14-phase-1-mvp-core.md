# FlowMail Phase 1 Implementation Plan (Monorepo)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build professional transactional email API and basic dashboard using a monorepo structure.

**Architecture:** Bun Workspaces monorepo. Hono API. Next.js Dashboard. Shared logic in packages.

**Tech Stack:** Bun, Hono, Next.js, Supabase, AWS SES, Zod, TailwindCSS.

---

### Task 1: Shared Validation & Types

**Files:**
- Create: `flowmail/packages/shared/src/index.ts`
- Create: `flowmail/packages/shared/src/schemas.ts`

- [ ] **Step 1: Define email schemas**

```typescript
// packages/shared/src/schemas.ts
import { z } from 'zod';

export const sendEmailSchema = z.object({
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
});

export type SendEmailRequest = z.infer<typeof sendEmailSchema>;
```

- [ ] **Step 2: Export from shared package**

```typescript
// packages/shared/src/index.ts
export * from './schemas';
```

---

### Task 2: Database Layer (@flowmail/db)

**Files:**
- Create: `flowmail/packages/db/src/index.ts`
- Create: `flowmail/packages/db/src/schema.sql`

- [ ] **Step 1: Define SQL schema** (same as before)
- [ ] **Step 2: Initialize Supabase client**

```typescript
// packages/db/src/index.ts
import { createClient } from '@supabase/supabase-js';

export const createDbClient = (url: string, key: string) => {
  return createClient(url, key);
};
```

---

### Task 3: Email Service Layer (@flowmail/email)

**Files:**
- Create: `flowmail/packages/email/src/index.ts`

- [ ] **Step 1: Initialize SES Client and Send Function**

```typescript
// packages/email/src/index.ts
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export const createEmailClient = (region: string, accessKeyId: string, secretAccessKey: string) => {
  return new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
};

export const sendEmail = async (client: SESClient, from: string, to: string, subject: string, html?: string, text?: string) => {
  const command = new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Message: {
      Body: {
        ...(html && { Html: { Data: html, Charset: "UTF-8" } }),
        ...(text && { Text: { Data: text, Charset: "UTF-8" } }),
      },
      Subject: { Data: subject, Charset: "UTF-8" },
    },
    Source: from,
  });
  return client.send(command);
};
```

---

### Task 4: API Implementation (apps/api)

**Files:**
- Create: `flowmail/apps/api/src/index.ts`
- Create: `flowmail/apps/api/src/middleware/auth.ts`

- [ ] **Step 1: Implement Auth Middleware using @flowmail/db**
- [ ] **Step 2: Implement POST /emails using @flowmail/email and @flowmail/shared**

---

### Task 5: Dashboard v1 (apps/web)

**Files:**
- Modify: `flowmail/apps/web/src/app/page.tsx`

- [ ] **Step 1: Build a simple "Send Logs" page fetching from Supabase**
- [ ] **Step 2: Add a "Test Send" form using @flowmail/shared validation**

---

### Task 6: Environment & Deployment Prep

- [ ] **Step 1: Setup root .env**
- [ ] **Step 2: Add scripts for running all services**
