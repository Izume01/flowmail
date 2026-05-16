# Production Robustness & Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address critical security, validation, and reliability gaps identified in the senior staff audit.

**Architecture:**
- Secure RPCs with `project_id` validation.
- Implement strict Zod validation in internal packages.
- Move client-side Supabase logic to API.
- Add structured error handling and logging.

**Tech Stack:** Bun, Hono, Supabase, Zod, Python (STO).

---

### Task 1: RPC Tenant Isolation (Immediate)

**Files:**
- Modify: `flowmail/packages/db/src/schema.sql`
- Modify: `flowmail/packages/db/src/dal.ts`

- [ ] **Step 1: Secure tracking RPCs**
Update `increment_opens`, `increment_clicks`, `increment_variant_sends`, and `bulk_increment_stats` to require `p_project_id` and verify it before performing any updates.

- [ ] **Step 2: Update DAL to pass projectId**
Update the `TenantDB` methods to pass `this.projectId` to these RPCs.

---

### Task 2: Package-Level Input Validation (High)

**Files:**
- Modify: `flowmail/packages/ai/src/index.ts`
- Modify: `flowmail/packages/email/src/index.ts`
- Modify: `flowmail/packages/sdk-node/src/index.ts`

- [ ] **Step 1: AI Package Validation**
Add Zod schemas for `getDeliverabilityScore`, `improveEmailContent`, and `analyzeSentiment` inputs. Throw clear errors if API keys or content are missing.

- [ ] **Step 2: Email Package Validation**
Add Zod validation for `sendEmail` and `renderTemplate` inputs.

---

### Task 3: Secure Billing Flow (Medium)

**Files:**
- Create: `flowmail/apps/api/src/routes/billing_v2.ts`
- Modify: `flowmail/apps/web/src/app/billing/page.tsx`

- [ ] **Step 1: Add `/billing/plan` endpoint**
Create an API endpoint that returns the current project's plan, so the frontend doesn't need a direct Supabase connection.

- [ ] **Step 2: Refactor Billing Page**
Remove direct `@flowmail/db` usage from the client component. Fetch plan info via the new API endpoint.

---

### Task 4: STO Model Robustness (Medium)

**Files:**
- Modify: `flowmail/sto-model/handler.py`

- [ ] **Step 1: Add Input Validation**
Validate `recipient_history` and `current_day_of_week` types and ranges in the Python handler.

- [ ] **Step 2: Improve Error Handling**
Provide specific error messages for model loading failures vs. inference failures.

---

### Task 5: Testing & Observability (High)

- [ ] **Step 1: Expand Coverage**
Add unit tests for the updated RPC isolation logic.
- [ ] **Step 2: Structured Logging**
Implement a simple `Logger` utility in `packages/shared` and use it across the API instead of `console.log`.
