# FlowMail Finalization Plan

## 1. Refactor `packages/db/src/dal.ts`
- Import `Prisma` from `@prisma/client`.
- Update `insertEmail` to use `Prisma.EmailUncheckedCreateInput` (excluding `projectId` as it's added manually).
- Update `insertWebhookDelivery` to use `Prisma.WebhookDeliveryUncheckedCreateInput`.
- Update `upsertContact` and `upsertSuppression`.
- Update `insertUserEvent`.
- Add JSDoc to all methods.
- Improve error handling: Wrap Prisma calls in try-catch and throw descriptive errors.

## 2. Refactor `packages/db/src/index.ts`
- Remove `createDbClient`.
- Ensure `getPrisma` uses a proper singleton.

## 3. Fix Logic in `apps/api/src/workers/analytics-worker.ts`
- In `processBatch`, when iterating over aggregated email stats, wrap the `prisma.$executeRawUnsafe` call in a try-catch (it already is, but ensure it's robust and logs enough context).
- Ensure the worker doesn't stop if one update fails.

## 4. Fix Logic in `apps/api/src/services/oracle.ts`
- Implement circular distance for `targetHourLocal` and `modeHour` (e.g., `min(|a-b|, 24-|a-b|)`).

## 5. Update `packages/shared/src/schemas.ts`
- Replace `z.any()` with `z.record(z.unknown())`.

## 6. Verification
- Run `bun test` in `flowmail` root.
- Ensure 73+ tests pass.
