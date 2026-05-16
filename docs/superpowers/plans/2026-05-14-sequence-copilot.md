# Sequence Co-Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a background worker that analyzes flow performance using Claude and generates actionable optimization suggestions.

**Architecture:**
- **FlowSuggestion Table**: Stores AI-generated notes linked to specific flow nodes.
- **AI Service**: Function to analyze a summary of flow stats (sends, opens, clicks, drop-offs).
- **Copilot Worker**: Background job that runs daily, processes active flows, and updates suggestions.

**Tech Stack:** Bun, Prisma (Neon), Claude 3.5 Sonnet.

---

### Task 1: Database Schema

**Files:**
- Modify: `flowmail/packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add FlowSuggestion model**

```prisma
model FlowSuggestion {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  flowId    String   @map("flow_id") @db.Uuid
  nodeId    String?  @map("node_id") // Optional: link to specific React Flow node
  content   String   // The AI recommendation
  priority  String   @default("medium") // low, medium, high
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  flow      Flow     @relation(fields: [flowId], references: [id], onDelete: Cascade)

  @@map("flow_suggestions")
}
```

- [ ] **Step 2: Update Flow model**
Add `suggestions FlowSuggestion[]` to the `Flow` model in `schema.prisma`.

- [ ] **Step 3: Generate Prisma client**
Run: `cd flowmail/packages/db && bun x prisma generate`

---

### Task 2: AI Optimization Service

**Files:**
- Modify: `flowmail/packages/ai/src/index.ts`

- [ ] **Step 1: Implement `analyzeFlowPerformance`**

```typescript
// flowmail/packages/ai/src/index.ts
export const analyzeFlowPerformance = async (apiKey: string, flowName: string, stats: any) => {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Analyze this automated email flow performance.
      Flow: ${flowName}
      Stats: ${JSON.stringify(stats)}
      
      Identify where users are dropping off. Suggest changes to subject lines, delays, or branching logic.
      Return JSON: { "suggestions": [{ "node_id": "optional", "content": "...", "priority": "high|medium|low" }] }`
    }],
  });
  // Parse and return JSON
};
```

---

### Task 3: Background Copilot Worker

**Files:**
- Create: `flowmail/apps/api/src/workers/copilot-worker.ts`
- Modify: `flowmail/apps/api/package.json`

- [ ] **Step 1: Implement worker logic**
1. Fetch all active flows with at least 10 executions.
2. For each flow, aggregate node-level stats (how many reached, how many converted).
3. Call `analyzeFlowPerformance`.
4. Delete old suggestions for that flow and insert new ones.

- [ ] **Step 2: Add script to package.json**
`"worker:copilot": "bun src/workers/copilot-worker.ts"`

---

### Task 4: UI Integration (Optional but recommended)

**Files:**
- Modify: `flowmail/apps/web/src/components/flow/FlowBuilder.tsx`

- [ ] **Step 1: Display suggestions**
Fetch `flow_suggestions` for the current flow and show them as persistent "Alerts" or "Sticky Notes" on the sidebar or overlaying the nodes.
