# Polishing & Hardening Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hardening the FlowMail monorepo by improving type safety, adding robust JSON extraction, implementing AI hallucination protection, and adding SES configuration sets.

**Architecture:** Surgical updates to AI, Shared, API, and Email packages. Adding authentication checks to web middleware.

**Tech Stack:** TypeScript, Bun, Zod, Hono, AWS SDK, Better Auth.

---

### Task 1: Hardening `packages/ai`

**Files:**
- Modify: `flowmail/packages/ai/src/index.ts`
- Test: `flowmail/packages/ai/src/index.test.ts`

- [ ] **Step 1: Define strict interfaces and schemas**

Replace `any[]` and `z.any()` with strict types.

```typescript
export interface FlowGraphNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface FlowGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface FlowGraphResult {
  nodes: FlowGraphNode[];
  edges: FlowGraphEdge[];
}

const FlowGraphNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.unknown()),
  position: z.object({ x: z.number(), y: z.number() }),
});

const FlowGraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
});
```

- [ ] **Step 2: Implement robust JSON extraction**

Add `tryExtractJson` helper.

```typescript
function tryExtractJson<T>(text: string): T {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    console.error('Failed to parse AI response:', text);
    throw new Error('Failed to parse AI response');
  }
}
```

- [ ] **Step 3: Update `analyzeFlowPerformance` stats schema**

```typescript
const performanceRequestSchema = z.object({
  apiKey: z.string().min(1, 'Anthropic API Key is required'),
  flowName: z.string().min(1, 'Flow name is required'),
  stats: z.record(z.unknown()),
});
```

- [ ] **Step 4: Verify with tests**

Run: `bun test flowmail/packages/ai/src/index.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add flowmail/packages/ai/src/index.ts
git commit -m "refactor(ai): add strict types and robust JSON extraction"
```

### Task 2: Hardening `packages/shared/logger.ts`

**Files:**
- Modify: `flowmail/packages/shared/src/logger.ts`

- [ ] **Step 1: Replace `any` with `Record<string, unknown>`**

```typescript
export class Logger {
  info(message: string, data?: Record<string, unknown>) {
    this.log('INFO', message, data);
  }
  // ... repeat for error, warn, debug
}
```

- [ ] **Step 2: Commit**

```bash
git add flowmail/packages/shared/src/logger.ts
git commit -m "refactor(shared): replace any with Record<string, unknown> in Logger"
```

### Task 3: SES Configuration Sets in `packages/email`

**Files:**
- Modify: `flowmail/packages/email/src/index.ts`

- [ ] **Step 1: Update `sendEmail` to accept `configurationSet`**

```typescript
export const sendEmail = async (
  client: SESClient,
  from: string,
  to: string,
  subject: string,
  html?: string,
  text?: string,
  configurationSet?: string
) => {
  // ... validation
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
    ...(configurationSet && { ConfigurationSetName: configurationSet }),
  });
  return client.send(command);
};
```

- [ ] **Step 2: Commit**

```bash
git add flowmail/packages/email/src/index.ts
git commit -m "feat(email): add support for SES Configuration Sets"
```

### Task 4: AI Hallucination Protection and Config Sets in `apps/api`

**Files:**
- Modify: `flowmail/apps/api/src/routes/emails.ts`

- [ ] **Step 1: Add `validatePlaceholders` check**

Implement logic to ensure `{{name}}` is preserved. (Note: The prompt mentions "AI Improved" version, which might come from a separate service call or be part of a larger flow. I will add the check where appropriate or as a helper).

Actually, `emails.post('/')` doesn't seem to call AI improvement yet. It handles sending. I will add the check for future-proofing or if I find where AI improvement is called. 
User said: "Implement a simple check to ensure that if the original email content had `{{name}}` tags, the 'AI Improved' version also has them."

I'll add it as a utility function in `emails.ts` for now.

- [ ] **Step 2: Pass default Configuration Set to `sendEmail`**

```typescript
await sendEmail(
  emailClient,
  body.from,
  body.to,
  finalSubject!,
  finalHtml,
  finalText,
  'flowmail-default'
);
```

- [ ] **Step 3: Commit**

```bash
git add flowmail/apps/api/src/routes/emails.ts
git commit -m "fix(api): add placeholder validation and pass default SES config set"
```

### Task 5: Web Middleware Protection

**Files:**
- Modify: `flowmail/apps/web/src/middleware.ts`

- [ ] **Step 1: Protect Dashboard and Flows routes**

```typescript
// Assuming auth is imported from a lib/auth.ts
import { auth } from './lib/auth'; 

export async function middleware(request: NextRequest) {
  const session = await auth.getSession({ req: request });
  const { pathname } = request.nextUrl;

  if (!session && (pathname === '/' || pathname.startsWith('/flows'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // ... rest of existing branding logic
}
```

- [ ] **Step 2: Commit**

```bash
git add flowmail/apps/web/src/middleware.ts
git commit -m "feat(web): protect dashboard and flows routes in middleware"
```
