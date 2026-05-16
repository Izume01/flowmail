# FlowMail Phase 2 Implementation Plan: Flow Builder

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual drag-and-drop flow builder and an execution engine powered by Upstash Workflow.

**Architecture:** Use React Flow for the UI. Store flows as JSONB in Supabase. Use Upstash Workflow for durable execution (handling waits, retries, and state).

**Tech Stack:** React Flow (@xyflow/react), Upstash Workflow, Supabase, Hono, Next.js.

---

### Task 1: Flow Database Schema

**Files:**
- Modify: `flowmail/packages/db/src/schema.sql`
- Modify: `flowmail/packages/db/src/index.ts`

- [ ] **Step 1: Add flows and flow_executions tables**

```sql
-- flowmail/packages/db/src/schema.sql

-- Flows table to store the graph
CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- e.g., 'user_signup', 'custom_event'
  graph JSONB NOT NULL, -- stores { nodes: [], edges: [], viewport: {} }
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Executions to track progress
CREATE TABLE flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID REFERENCES flows(id),
  project_id UUID REFERENCES projects(id),
  status TEXT DEFAULT 'running', -- running, completed, failed
  context_data JSONB DEFAULT '{}', -- data passed to the flow
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Update DB package to support flows**

```typescript
// flowmail/packages/db/src/index.ts
// Add types for Flow and Execution if needed, or just ensure the client can query these tables.
```

- [ ] **Step 3: Commit**

```bash
git add flowmail/packages/db/
git commit -m "chore(db): add flows and flow_executions tables"
```

---

### Task 2: Flow Builder UI (Frontend)

**Files:**
- Create: `flowmail/apps/web/src/components/flow/FlowBuilder.tsx`
- Create: `flowmail/apps/web/src/components/flow/CustomNodes.tsx`
- Modify: `flowmail/apps/web/package.json`

- [ ] **Step 1: Install React Flow**

Run: `cd flowmail/apps/web && bun add @xyflow/react`

- [ ] **Step 2: Create basic FlowBuilder component**

Implement a React Flow canvas that can:
- Display nodes and edges.
- Add nodes of different types (Trigger, Send Email, Wait, Condition).
- Save the graph to Supabase via a server action or API route.

- [ ] **Step 3: Define Custom Nodes**

```typescript
// flowmail/apps/web/src/components/flow/CustomNodes.tsx
// Define visual styles for:
// - TriggerNode
// - SendEmailNode
// - WaitNode
// - ConditionNode
```

- [ ] **Step 4: Commit**

```bash
git add flowmail/apps/web/
git commit -m "feat(web): add basic flow builder UI with React Flow"
```

---

### Task 3: Execution Engine (Backend)

**Files:**
- Modify: `flowmail/apps/api/package.json`
- Create: `flowmail/apps/api/src/routes/workflows.ts`
- Modify: `flowmail/apps/api/src/index.ts`

- [ ] **Step 1: Install Upstash Workflow**

Run: `cd flowmail/apps/api && bun add @upstash/workflow @upstash/qstash`

- [ ] **Step 2: Implement Workflow Orchestrator**

Create a Hono route using Upstash `serve` that:
1. Loads the flow graph from the DB.
2. Traverses the nodes starting from the trigger.
3. For each node, uses `context.run` or `context.sleep`.

```typescript
// flowmail/apps/api/src/routes/workflows.ts
import { serve } from "@upstash/workflow/hono";
import { createDbClient } from "@flowmail/db";

export const flowWorkflow = serve(async (context) => {
  const { flowId, projectId, initialData } = context.requestPayload;
  
  // Logic to fetch flow, traverse nodes, and execute actions
  // This will be a recursive or loop-based graph traverser.
});
```

- [ ] **Step 3: Commit**

```bash
git add flowmail/apps/api/
git commit -m "feat(api): implement durable flow execution engine with Upstash"
```

---

### Task 4: Trigger Integration

**Files:**
- Modify: `flowmail/apps/api/src/routes/events.ts` (New)
- Modify: `flowmail/apps/api/src/index.ts`

- [ ] **Step 1: Create /events endpoint**

An endpoint for developers to trigger flows:
`POST /events { "event": "user_signup", "data": { "email": "..." } }`

- [ ] **Step 2: Trigger Workflow**

When an event is received:
1. Find active flows for that `event` and `projectId`.
2. For each flow, use `workflowClient.trigger()` to start the Upstash workflow.

- [ ] **Step 3: Commit**

```bash
git add flowmail/apps/api/
git commit -m "feat(api): add events endpoint to trigger flows"
```
