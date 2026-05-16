# Extreme AI - The Oracle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Oracle" prediction API and real-time UI dashboard card.

**Architecture:**
- Hono API endpoint `/ai/predict`.
- Next.js Client Component `OracleCard` linked to `TestSendForm`.

---

### Task 1: Probability Service

**Files:**
- Modify: `flowmail/packages/db/src/dal.ts`
- Create: `flowmail/apps/api/src/services/oracle.ts`

- [ ] **Step 1: Add method to DAL**

```typescript
// flowmail/packages/db/src/dal.ts
  async getRecipientStats(email: string) {
    // Return total sends, total opens, and latest open hour
    const { data } = await this.supabase
      .from('emails')
      .select('status, opens, local_open_hour')
      .eq('project_id', this.projectId)
      .eq('to_email', email);
    return data || [];
  }
```

- [ ] **Step 2: Implement probability heuristic**

```typescript
// flowmail/apps/api/src/services/oracle.ts
import { TenantDB } from '@flowmail/db';

export async function calculateProbability(tenantDb: TenantDB, email: string, subject: string, targetHourLocal: number) {
  const stats = await tenantDb.getRecipientStats(email);
  
  if (stats.length === 0) {
    return { probability: 45, factors: ["No historical data. Using global average."] };
  }

  let probability = 50; // base
  const factors = [];

  const opens = stats.filter(s => s.opens > 0);
  const openRate = opens.length / stats.length;
  
  if (openRate > 0.5) {
    probability += 20;
    factors.push("High historical engagement");
  } else if (openRate === 0) {
    probability -= 15;
    factors.push("Recipient rarely opens emails");
  }

  // Find most frequent open hour
  const hours = opens.map(o => o.local_open_hour).filter(h => h !== null);
  if (hours.length > 0) {
    const modeHour = hours.sort((a,b) => hours.filter(v => v===a).length - hours.filter(v => v===b).length).pop();
    const distance = Math.abs((modeHour || 0) - targetHourLocal);
    if (distance <= 2) {
      probability += 15;
      factors.push(`Sending close to preferred hour (${modeHour}:00)`);
    } else {
      probability -= 10;
      factors.push(`Sending off-peak (preferred: ${modeHour}:00)`);
    }
  }

  // Subject length heuristic
  if (subject && subject.length > 10 && subject.length < 50) {
    probability += 5;
    factors.push("Subject length is optimal");
  }

  return { probability: Math.min(Math.max(probability, 0), 99), factors };
}
```

---

### Task 2: Prediction API Route

**Files:**
- Modify: `flowmail/apps/api/src/routes/ai.ts`

- [ ] **Step 1: Implement `/predict` endpoint**

```typescript
// flowmail/apps/api/src/routes/ai.ts
import { calculateProbability } from '../services/oracle';

// ...
ai.post('/predict', async (c) => {
  const body = await c.req.json();
  const projectId = c.get('projectId');
  
  const tenantDb = new TenantDB(createDbClient(...), projectId);
  
  // Assume target is current UTC hour if not provided (simplified for MVP)
  const targetHour = new Date().getUTCHours(); 
  
  const result = await calculateProbability(tenantDb, body.to, body.subject, targetHour);
  return c.json(result);
});
```

---

### Task 3: Dashboard UI Integration

**Files:**
- Modify: `flowmail/apps/web/src/app/page.tsx`
- Create: `flowmail/apps/web/src/components/OracleCard.tsx`

- [ ] **Step 1: Create Oracle component**
A component that accepts `email` and `subject` props. It should `useEffect` (with a debounce) to fetch from `/api/ai/predict` and display the probability ring and factors.

- [ ] **Step 2: Connect to form state**
Lift the `to` and `subject` state up from `TestSendForm` into `page.tsx` so both the form and `OracleCard` can read it.
