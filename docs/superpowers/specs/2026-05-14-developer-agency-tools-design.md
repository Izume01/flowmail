# FlowMail Developer & Agency Tools Design

**Goal:** Provide professional-grade tools for external developers and agencies.

**Architecture:**
- **Webhook Dispatcher**: An asynchronous queue that posts events (`email.opened`, `email.clicked`) to user-defined URLs.
- **White-Labeling Proxy**: A Next.js middleware that resolves branding and configuration based on the incoming hostname.
- **SDK Generator**: A script to generate type-safe clients for the API.

---

## 1. Webhook System

**Database Schema:**
- `webhook_configs`: `id`, `project_id`, `url`, `secret_key`, `is_active`.
- `webhook_deliveries`: `id`, `webhook_config_id`, `event_type`, `payload`, `status_code`, `attempts`.

**Logic:**
1. When an event happens (e.g., in `track.ts`), find all active `webhook_configs` for the project.
2. For each config, add a job to an Upstash Queue (or similar).
3. The worker POSTs to the `url` with an `X-FlowMail-Signature`.

---

## 2. White-Labeling (Next.js)

**Logic:**
1. A new table `agency_configs`: `id`, `project_id`, `custom_domain`, `logo_url`, `brand_color`.
2. Next.js `middleware.ts` checks the `Host` header.
3. If the host matches a `custom_domain`, fetch the branding and inject it into the application context (via a cookie or header).

---

## 3. SDKs

**Structure:**
- `@flowmail/sdk-node`: A thin wrapper using `fetch` and Zod for types.
- `flowmail-python`: A Python package using `requests`.

---

## 4. Testing Strategy
- **Webhook Dispatcher**: Use a mock server (e.g., `https://webhook.site`) to verify deliveries.
- **SDK**: Unit test the client with a mock Hono instance.
