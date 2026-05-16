# Developer & Agency Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement webhooks, white-labeling foundation, and SDKs.

**Architecture:**
- Webhooks using `@flowmail/db`.
- Next.js middleware for white-labeling.

---

### Task 1: Webhook System

**Files:**
- Modify: `flowmail/packages/db/src/schema.sql`
- Create: `flowmail/apps/api/src/services/webhooks.ts`
- Modify: `flowmail/apps/api/src/routes/track.ts`

- [ ] **Step 1: Add webhook tables**
`webhook_configs` and `webhook_deliveries`.

- [ ] **Step 2: Implement Dispatcher**
Function `dispatchWebhookEvent` that creates delivery records and sends the request.

- [ ] **Step 3: Hook into tracking**
Call the dispatcher when an email is opened or clicked.

---

### Task 2: White-Labeling (Middleware)

**Files:**
- Create: `flowmail/apps/web/src/middleware.ts`

- [ ] **Step 1: Implement Domain Resolver**
Middleware that detects custom domains and adds branding info to headers.

---

### Task 3: SDKs (Node/Bun)

**Files:**
- Create: `flowmail/packages/sdk-node/package.json`
- Create: `flowmail/packages/sdk-node/src/index.ts`

- [ ] **Step 1: Implement SDK wrapper**
A clean class-based SDK for sending emails and triggering flows.
