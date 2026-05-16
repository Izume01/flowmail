# Dynamic Segmentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the database schema, SQL generator, and API endpoints for dynamic segmentation.

**Architecture:**
- Supabase `segments` table with JSONB rules.
- GIN indexes on `contacts.attributes` and `user_events.properties`.
- TypeScript utility to convert JSON AST to raw Postgres queries.

---

### Task 1: Database Schema & Indexes

**Files:**
- Modify: `flowmail/packages/db/src/schema.sql`
- Modify: `flowmail/packages/db/src/dal.ts`

- [ ] **Step 1: Add segments table and indexes**

```sql
-- flowmail/packages/db/src/schema.sql
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rules JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimize JSONB querying
CREATE INDEX idx_contacts_attributes ON contacts USING GIN (attributes);
CREATE INDEX idx_user_events_properties ON user_events USING GIN (properties);
```

- [ ] **Step 2: Add DAL methods**

```typescript
// flowmail/packages/db/src/dal.ts
// In TenantDB:
  async createSegment(name: string, rules: any) {
    return this.supabase
      .from('segments')
      .insert({ project_id: this.projectId, name, rules })
      .select()
      .single();
  }

  async getSegment(segmentId: string) {
    return this.supabase
      .from('segments')
      .select('*')
      .eq('id', segmentId)
      .eq('project_id', this.projectId)
      .single();
  }
```

---

### Task 2: SQL Generator Utility

**Files:**
- Create: `flowmail/packages/db/src/segmentEvaluator.ts`
- Modify: `flowmail/packages/db/src/index.ts`

- [ ] **Step 1: Implement `SegmentEvaluator`**

```typescript
// flowmail/packages/db/src/segmentEvaluator.ts
export interface SegmentRule {
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

export type Condition = AttributeCondition | EventCondition;

export interface AttributeCondition {
  type: 'attribute';
  field: string;
  operator: 'equals' | 'not_equals';
  value: string;
}

export interface EventCondition {
  type: 'event';
  event_name: string;
  operator: 'count_greater_than';
  value: number;
  timeframe_days: number;
}

export class SegmentEvaluator {
  static generateSql(projectId: string, rule: SegmentRule): string {
    const conditionsSql = rule.conditions.map(c => {
      if (c.type === 'attribute') {
        const op = c.operator === 'equals' ? '=' : '!=';
        // Use proper parameterization in real app, simplified for MVP
        return `attributes->>'${c.field}' ${op} '${c.value}'`;
      }
      if (c.type === 'event') {
        return `id IN (
          SELECT contact_id FROM user_events 
          WHERE event_name = '${c.event_name}' 
          AND project_id = '${projectId}'
          AND created_at > NOW() - INTERVAL '${c.timeframe_days} days' 
          GROUP BY contact_id 
          HAVING COUNT(*) > ${c.value}
        )`;
      }
      return '1=1';
    });

    const joinOp = rule.operator === 'AND' ? ' AND ' : ' OR ';
    return `SELECT * FROM contacts WHERE project_id = '${projectId}' AND (${conditionsSql.join(joinOp)})`;
  }
}
```

- [ ] **Step 2: Export from DB package**
Update `flowmail/packages/db/src/index.ts`.

---

### Task 3: API Endpoints

**Files:**
- Modify: `flowmail/apps/api/src/routes/audience.ts`

- [ ] **Step 1: Create Segment Endpoints**

```typescript
// flowmail/apps/api/src/routes/audience.ts
import { SegmentEvaluator } from '@flowmail/db';

// ... inside audience router
audience.post('/segments', async (c) => {
  const body = await c.req.json();
  // Assume body has name, rules
  const tenantDb = new TenantDB(..., c.get('projectId'));
  const { data, error } = await tenantDb.createSegment(body.name, body.rules);
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

audience.get('/segments/:id/contacts', async (c) => {
  const segmentId = c.req.param('id');
  const projectId = c.get('projectId');
  const tenantDb = new TenantDB(..., projectId);
  
  const { data: segment } = await tenantDb.getSegment(segmentId);
  if (!segment) return c.json({ error: 'Segment not found' }, 404);

  const rawSql = SegmentEvaluator.generateSql(projectId, segment.rules);
  
  // Note: We need a way to execute raw SQL. Supabase rpc is best.
  // For MVP plan: assuming a generic rpc 'execute_sql' or similar exists,
  // or we add it to the schema.
  
  const { data: contacts, error } = await tenantDb.executeRawQuery(rawSql);
  if (error) return c.json({ error: error.message }, 500);
  
  return c.json({ contacts });
});
```

- [ ] **Step 2: Add `executeRawQuery` to Schema & DAL**
(Because Supabase JS doesn't do raw SQL natively)
Add a function `execute_segment_query(p_query TEXT)` to `schema.sql`.
Add `executeRawQuery(sql: string)` to `TenantDB`.
