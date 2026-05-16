# FlowMail Audience Engine (CRM) Design

**Goal:** Evolve FlowMail from a stateless delivery API into a Customer Data Platform (CDP) by storing contacts and processing custom user events.

**Architecture:**
- **Contacts Table**: Stores user identities and custom attributes (JSONB).
- **Events Table**: Stores a time-series log of all user actions.
- **Collector API**: Two endpoints (`POST /identify`, `POST /track`) to ingest this data.
- **SDK Updates**: Helper methods for developers to easily push this data.

---

## 1. Database Schema

### `contacts` Table
The core representation of a user in a specific project.
- `id`: UUID (PK)
- `project_id`: UUID (FK)
- `email`: TEXT (Unique per project)
- `first_name`: TEXT (Nullable)
- `last_name`: TEXT (Nullable)
- `attributes`: JSONB (Stores custom data like `plan: 'pro'`, `ltv: 500`)
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### `user_events` Table
An append-only log of every action a contact takes.
- `id`: UUID (PK)
- `project_id`: UUID (FK)
- `contact_id`: UUID (FK to `contacts`)
- `event_name`: TEXT (e.g., 'Plan Upgraded', 'Cart Abandoned')
- `properties`: JSONB (Metadata about the event)
- `created_at`: TIMESTAMPTZ

---

## 2. Collector API (`apps/api`)

Create a new router: `flowmail/apps/api/src/routes/audience.ts`.

### Endpoint A: `POST /identify`
**Purpose:** Create or update a contact and their attributes.
**Payload:**
```json
{
  "email": "alice@example.com",
  "firstName": "Alice",
  "attributes": {
    "plan": "growth",
    "company": "Acme Corp"
  }
}
```
**Logic:** `UPSERT` into `contacts` table matching on `(project_id, email)`. Deep merge the `attributes` JSONB.

### Endpoint B: `POST /track`
**Purpose:** Log a specific action taken by a contact.
**Payload:**
```json
{
  "email": "alice@example.com",
  "event": "project_created",
  "properties": {
    "project_name": "New Alpha"
  }
}
```
**Logic:**
1. Look up `contact_id` from `contacts` where `email = payload.email`.
2. (Optional) If contact doesn't exist, create an anonymous/empty contact record first.
3. `INSERT` into `user_events`.
4. Trigger workflow engine (if any flows are listening for `project_created`).

---

## 3. SDK Updates (`@flowmail/sdk`)

Add two methods to the Node SDK:
- `flowmail.identify(payload)`
- `flowmail.track(payload)`

This gives developers a beautiful, segment-like experience.

---

## 4. Testing Strategy
- **DB Tests**: Verify the `UPSERT` logic correctly merges JSONB attributes without overwriting unrelated keys.
- **API Tests**: Mock the DB and ensure `/identify` returns the created/updated contact. Ensure `/track` successfully inserts the event.
- **SDK Tests**: Verify the SDK correctly formats the payload and hits the new endpoints.
