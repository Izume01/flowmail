# FlowMail Phase 3 Implementation Plan: AI Layer + Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement AI-powered deliverability scoring, click/open tracking, React Email templates, and Stripe billing.

**Architecture:** Use Claude API for AI features. Use Hono routes for tracking redirects and pixels. Integrate React Email for professional templates.

**Tech Stack:** Claude API (Anthropic), React Email, Stripe, Hono, Next.js.

---

### Task 1: AI Deliverability Layer (@flowmail/ai)

**Files:**
- Create: `flowmail/packages/ai/package.json`
- Create: `flowmail/packages/ai/src/index.ts`

- [ ] **Step 1: Setup AI package**

Run: `cd flowmail/packages && mkdir ai && cd ai && bun init -y && bun add @anthropic-ai/sdk`

- [ ] **Step 2: Implement scoring and suggestions**

```typescript
// flowmail/packages/ai/src/index.ts
import Anthropic from '@anthropic-ai/sdk';

export const getDeliverabilityScore = async (apiKey: string, subject: string, body: string) => {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Analyze this email for deliverability. 
      Subject: ${subject}
      Body: ${body}
      Return JSON: { "score": 0-100, "recommendations": [], "spam_triggers": [] }`
    }],
  });
  // Parse and return JSON
};
```

- [ ] **Step 3: Commit**

```bash
git add flowmail/packages/ai/
git commit -m "feat(ai): add deliverability scoring package"
```

---

### Task 2: Tracking System (API)

**Files:**
- Create: `flowmail/apps/api/src/routes/track.ts`
- Modify: `flowmail/apps/api/src/index.ts`

- [ ] **Step 1: Implement tracking pixel route**

```typescript
// flowmail/apps/api/src/routes/track.ts
const TRANSPARENT_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

track.get('/open/:emailId.png', async (c) => {
  const emailId = c.req.param('emailId');
  // 1. Update DB: increment opens
  // 2. Return pixel with no-cache headers
});
```

- [ ] **Step 3: Implement click redirect route**

```typescript
track.get('/click', async (c) => {
  const { url, emailId } = c.req.query();
  // 1. Update DB: increment clicks
  // 2. Redirect to original URL
});
```

- [ ] **Step 4: Commit**

```bash
git add flowmail/apps/api/src/routes/track.ts
git commit -m "feat(api): add open and click tracking routes"
```

---

### Task 3: React Email Integration

**Files:**
- Modify: `flowmail/packages/email/package.json`
- Create: `flowmail/packages/email/src/templates/`

- [ ] **Step 1: Install React Email**

Run: `cd flowmail/packages/email && bun add @react-email/components @react-email/render`

- [ ] **Step 2: Create a base template**

- [ ] **Step 3: Update `sendEmail` to support templates**

---

### Task 4: Stripe Billing

**Files:**
- Create: `flowmail/apps/api/src/routes/billing.ts`
- Modify: `flowmail/apps/web/src/app/billing/page.tsx`

- [ ] **Step 1: Install Stripe**

Run: `bun add stripe`

- [ ] **Step 2: Implement Checkout and Webhook**

---

### Task 5: Final Polish & UI

- [ ] **Step 1: Add AI score to dashboard**
- [ ] **Step 2: Add analytics charts for opens/clicks**
- [ ] **Step 3: Final SEO and Metadata polish**
