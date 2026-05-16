You are implementing Task 1: Refactor apps/api/src/routes/

## Task Description

**Files:**
- Modify: `apps/api/src/routes/workflows.ts`
- Modify: `apps/api/src/routes/events.ts`
- Modify: `apps/api/src/routes/ai.ts`
- Modify: `apps/api/src/routes/track.ts`
- Modify: `apps/api/src/routes/billing.ts`
- Modify: `apps/api/src/routes/audience.ts`

- [ ] **Step 1: Refactor workflows.ts**
  Replace `createDbClient` with `getPrisma()`. Update `TenantDB` instantiation.
- [ ] **Step 2: Refactor events.ts**
  Replace `createDbClient` with `getPrisma()`. Update `TenantDB` instantiation.
- [ ] **Step 3: Refactor ai.ts**
  Replace `createDbClient` with `getPrisma()`. Update `TenantDB` instantiation.
- [ ] **Step 4: Refactor track.ts**
  Replace `createDbClient` with `getPrisma()`.
- [ ] **Step 5: Refactor billing.ts**
  Replace `createDbClient` with `getPrisma()`. Update `TenantDB` instantiation.
- [ ] **Step 6: Refactor audience.ts**
  Replace `createDbClient` with `getPrisma()`. Update `TenantDB` instantiation.

## Context

We are finalizing the migration from Supabase to Neon/Prisma. 
- `packages/db` now exports `getPrisma()` which returns a Prisma client.
- `TenantDB` now expects a Prisma client in its constructor: `new TenantDB(getPrisma(), projectId)`.
- Supabase used a `{ data, error }` pattern. Prisma returns data directly or throws on error. You must handle this transition.

## Your Job

Once you're clear on requirements:
1. Implement exactly what the task specifies
2. Write tests (following TDD if task says to)
3. Verify implementation works
4. Commit your work
5. Self-review
6. Report back

Work from: `/root/flowmail`

## Report Format

When done, report:
- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- What you implemented (or what you attempted, if blocked)
- What you tested and test results
- Files changed
- Self-review findings (if any)
- Any issues or concerns
