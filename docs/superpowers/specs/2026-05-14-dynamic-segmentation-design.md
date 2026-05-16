# FlowMail Dynamic Segmentation Design

**Goal:** Allow users to define logical rules (segments) that automatically group contacts based on attributes and event history.

**Architecture:**
- **`segments` Table:** Stores the logical rules as JSON.
- **SQL Generator:** A utility in `@flowmail/db` that parses the segment JSON and outputs a raw Postgres `WHERE` clause.
- **API Endpoints:** CRUD operations for segments, plus an endpoint to preview/fetch contacts in a segment.

---

## 1. Database Schema

### `segments` Table
- `id`: UUID (PK)
- `project_id`: UUID (FK)
- `name`: TEXT
- `rules`: JSONB (The abstract syntax tree of the segment logic)
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### GIN Indexes
To make Option A fast, we must index the JSONB columns:
```sql
CREATE INDEX idx_contacts_attributes ON contacts USING GIN (attributes);
CREATE INDEX idx_user_events_properties ON user_events USING GIN (properties);
```

---

## 2. Rule Definition Schema (JSON)

The `rules` column will store an Abstract Syntax Tree (AST) representing the logic.

```json
{
  "operator": "AND",
  "conditions": [
    {
      "type": "attribute",
      "field": "plan",
      "operator": "equals",
      "value": "pro"
    },
    {
      "type": "event",
      "event_name": "login",
      "operator": "count_greater_than",
      "value": 5,
      "timeframe_days": 30
    }
  ]
}
```

---

## 3. SQL Generator Utility

A class `SegmentEvaluator` that takes the JSON rules and builds the query:

**For Attributes:**
`attributes->>'plan' = 'pro'`

**For Events:**
`id IN (SELECT contact_id FROM user_events WHERE event_name = 'login' AND created_at > NOW() - INTERVAL '30 days' GROUP BY contact_id HAVING COUNT(*) > 5)`

---

## 4. API Endpoints

- `POST /audience/segments`: Create a new segment.
- `GET /audience/segments/:id/contacts`: Returns the list of contacts currently matching the segment by executing the generated SQL.

---

## 5. Testing Strategy
- Create dummy contacts and events.
- Build a segment JSON object.
- Pass it to the generator and ensure the output SQL returns the correct subset of contacts.
