# FlowMail Phase 4 Implementation Plan: Advanced AI & Optimization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement AI-powered content rewriting (Auto-Fixer), A/B testing with auto-switching (Thompson Sampling), and Send Time Optimization (STO).

**Architecture:** Use Claude for Auto-Fixer. Use a Thompson Sampling (Multi-Armed Bandit) algorithm for A/B testing. Implement a tracking-based scoring system for STO.

**Tech Stack:** Claude API, Supabase (for logs), Hono (for algorithm), Bun.

---

### Task 1: AI Auto-Fixer (@flowmail/ai)

**Files:**
- Modify: `flowmail/packages/ai/src/index.ts`

- [ ] **Step 1: Implement `improveEmailContent`**

```typescript
// flowmail/packages/ai/src/index.ts
export const improveEmailContent = async (apiKey: string, subject: string, body: string) => {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are an expert Copywriter. Rewrite this email to improve deliverability and engagement.
      Original Subject: ${subject}
      Original Body: ${body}
      Return JSON: { "optimized_subject": "", "optimized_body": "", "explanation": "" }`
    }],
  });
  // Parse and return
};
```

- [ ] **Step 2: Add "Auto-Fix" button to Dashboard**
- [ ] **Step 3: Commit**

---

### Task 2: A/B Testing & Auto-Switching

**Files:**
- Modify: `flowmail/packages/db/src/schema.sql`
- Create: `flowmail/apps/api/src/utils/bandit.ts`
- Modify: `flowmail/apps/api/src/routes/emails.ts`

- [ ] **Step 1: Add A/B variants to DB**

```sql
ALTER TABLE emails ADD COLUMN variant_id TEXT;
-- Add a table for tracking variants and their stats
CREATE TABLE email_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  subject TEXT NOT NULL,
  sends INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE
);
```

- [ ] **Step 2: Implement Thompson Sampling**

```typescript
// flowmail/apps/api/src/utils/bandit.ts
// Calculate Beta distribution and pick winner
```

- [ ] **Step 3: Auto-switch logic in `POST /emails`**
If a project has multiple variants, pick one based on the bandit algorithm.

- [ ] **Step 4: Commit**

---

### Task 3: Send Time Optimization (STO)

**Files:**
- Create: `flowmail/apps/api/src/services/sto.ts`
- Modify: `flowmail/packages/db/src/schema.sql`

- [ ] **Step 1: Track engagement hour**

```sql
ALTER TABLE emails ADD COLUMN local_open_hour INTEGER;
```

- [ ] **Step 2: Implement `getBestSendTime`**
Analyze historical `local_open_hour` for a recipient.

- [ ] **Step 3: Integrate with Workflows**
Use `context.sleep` in Upstash Workflow to delay sends until the "best" time.

- [ ] **Step 4: Commit**

---

### Task 4: Custom Model Strategy (Research/MVP)

- [ ] **Step 1: Export engagement logs to JSON**
- [ ] **Step 2: Draft a simple Python script (outside monorepo) to train a LightGBM model on the CSV/JSON data.**
- [ ] **Step 3: Plan for a "sidecar" microservice or an Edge Function that serves the model.**
