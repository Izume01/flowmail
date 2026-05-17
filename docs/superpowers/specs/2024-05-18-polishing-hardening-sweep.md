# Design Spec: FlowMail Polishing & Hardening Sweep

## Goal
Address "weak" implementations across the FlowMail monorepo to improve type safety, robustness, and security.

## Proposed Changes

### 1. AI Package (`packages/ai/src/index.ts`)
- **Interfaces:**
  - Define `FlowGraphNode` (id, type, data, position) and `FlowGraphEdge` (id, source, target, sourceHandle).
  - Update `FlowGraphResult` to use these interfaces.
- **Zod Schemas:**
  - Define `FlowGraphNodeSchema` and `FlowGraphEdgeSchema`.
  - Update `performanceRequestSchema` to use `z.record(z.unknown())` for `stats`.
- **Robust JSON Extraction:**
  - Implement `tryExtractJson(text: string): any` using regex `/\{[\s\S]*\}/` and `JSON.parse`.

### 2. Shared Package (`packages/shared/src/logger.ts`)
- Replace `data?: any` with `data?: Record<string, unknown>` in `Logger` methods.

### 3. API Routes (`apps/api/src/routes/emails.ts`)
- **Placeholder Validation:**
  - Logic: If `originalBody` contains `{{name}}` but `improvedBody` does not, log warning and use `originalBody`.
- **SES Config Set:**
  - Pass `ConfigurationSetName: 'flowmail-default'` to `sendEmail`.

### 4. Email Package (`packages/email/src/index.ts`)
- Update `sendEmail` parameter list to include `configurationSet?: string`.
- Pass `ConfigurationSetName` to `SendEmailCommand`.

### 5. Web Middleware (`apps/web/src/middleware.ts`)
- Protect `/` and `/flows` routes.
- Use `auth.getSession({ req: request })` (standard `better-auth` pattern) to verify authentication.
- Redirect to `/login` if no session exists.

## Verification Plan
- Run `bun test` in each package/app.
- Manual check: Grep for `any` in modified files.
- Manual check: Verify SES command includes `ConfigurationSetName`.
