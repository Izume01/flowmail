# Production Hardening: Package-Level Input Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement strict Zod validation for inputs in `@flowmail/ai`, `@flowmail/email`, and `@flowmail/sdk` packages to ensure production robustness.

**Architecture:** 
- Add Zod schemas to each package to validate incoming parameters before processing.
- Leverage `@flowmail/shared` schemas in the SDK.
- Update tests to verify that invalid inputs are rejected with clear error messages.

**Tech Stack:** Bun, TypeScript, Zod.

---

### Task 1: AI Package Validation

**Files:**
- Modify: `flowmail/packages/ai/package.json`
- Modify: `flowmail/packages/ai/src/index.ts`
- Test: `flowmail/packages/ai/src/index.test.ts`

- [ ] **Step 1: Add zod dependency to @flowmail/ai**
Run: `bun add zod` in `flowmail/packages/ai`
Or manually update `package.json`:
```json
"dependencies": {
  "@anthropic-ai/sdk": "^0.96.0",
  "zod": "^3.23.8"
}
```

- [ ] **Step 2: Add validation tests for getDeliverabilityScore**
Modify `flowmail/packages/ai/src/index.test.ts` to add cases for empty API key and blank content.

- [ ] **Step 3: Add validation tests for improveEmailContent**
Modify `flowmail/packages/ai/src/index.test.ts`.

- [ ] **Step 4: Add validation tests for analyzeSentiment**
Modify `flowmail/packages/ai/src/index.test.ts`.

- [ ] **Step 5: Implement validation in AI package**
Modify `flowmail/packages/ai/src/index.ts` to use Zod for input validation.

- [ ] **Step 6: Run tests and verify failure/pass**
Run: `bun test flowmail/packages/ai/src/index.test.ts`

- [ ] **Step 7: Commit**

---

### Task 2: Email Package Validation

**Files:**
- Modify: `flowmail/packages/email/package.json`
- Modify: `flowmail/packages/email/src/index.ts`
- Create: `flowmail/packages/email/src/index.test.ts`

- [ ] **Step 1: Add zod dependency to @flowmail/email**
Run: `bun add zod` in `flowmail/packages/email`.

- [ ] **Step 2: Create unit tests for sendEmail and renderTemplate validation**
Create `flowmail/packages/email/src/index.test.ts`.

- [ ] **Step 3: Implement validation in Email package**
Modify `flowmail/packages/email/src/index.ts`.

- [ ] **Step 4: Run tests**
Run: `bun test flowmail/packages/email/src/index.test.ts`

- [ ] **Step 5: Commit**

---

### Task 3: SDK-Node Package Validation

**Files:**
- Modify: `flowmail/packages/sdk-node/src/index.ts`
- Modify: `flowmail/packages/sdk-node/src/index.test.ts`

- [ ] **Step 1: Add validation tests for SDK**
Modify `flowmail/packages/sdk-node/src/index.test.ts` to test invalid config and invalid method inputs.

- [ ] **Step 2: Implement validation in SDK**
Modify `flowmail/packages/sdk-node/src/index.ts`. Use schemas from `@flowmail/shared`.

- [ ] **Step 3: Run tests**
Run: `bun test flowmail/packages/sdk-node/src/index.test.ts`

- [ ] **Step 4: Commit**
