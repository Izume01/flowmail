# Custom Domain Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated DNS verification and a "Settings > Domains" dashboard page for managing sending infrastructure.

**Architecture:** 
- Add `verificationToken` to the `Domain` model in Prisma.
- Use a challenge-response mechanism: User adds a TXT record `_flowmail-challenge.<domain>` with a unique token.
- Background service (or direct API call) uses the Node `dns` module to verify the record.
- Next.js UI for managing domains and viewing DNS instructions.

**Tech Stack:** Bun, Prisma (Neon), Node `dns`, TailwindCSS.

---

### Task 1: Schema Update & Token Generation

**Files:**
- Modify: `flowmail/packages/db/prisma/schema.prisma`

- [ ] **Step 1: Update Domain model**

```prisma
model Domain {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId         String   @map("project_id") @db.Uuid
  domainName        String   @map("domain_name")
  isVerified        Boolean  @default(false) @map("is_verified")
  verificationToken String   @map("verification_token")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz

  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("domains")
}
```

- [ ] **Step 2: Generate Prisma client**
Run: `cd flowmail/packages/db && bun x prisma generate`

---

### Task 2: DNS Verification Service

**Files:**
- Create: `flowmail/apps/api/src/services/dns.ts`

- [ ] **Step 1: Implement DNS check**

```typescript
// flowmail/apps/api/src/services/dns.ts
import * as dns from 'dns/promises';

export async function verifyDomainDNS(domain: string, expectedToken: string): Promise<boolean> {
  try {
    const challengeDomain = `_flowmail-challenge.${domain}`;
    const records = await dns.resolveTxt(challengeDomain);
    
    // Flatten and check if any record matches the token
    const flatRecords = records.flat();
    return flatRecords.some(r => r.includes(expectedToken));
  } catch (e) {
    return false;
  }
}
```

---

### Task 3: API Endpoints for Domains

**Files:**
- Create: `flowmail/apps/api/src/routes/domains.ts`
- Modify: `flowmail/apps/api/src/index.ts`

- [ ] **Step 1: Implement Domain Routes**

- `POST /`: Add a new domain. Generate a random `verificationToken` (e.g., `fm_` + uuid).
- `GET /`: List all domains for the project.
- `POST /:id/verify`: Trigger `verifyDomainDNS`. If success, update `isVerified: true`.

---

### Task 4: Settings > Domains UI

**Files:**
- Create: `flowmail/apps/web/src/app/settings/domains/page.tsx`
- Create: `flowmail/apps/web/src/components/DomainManager.tsx`

- [ ] **Step 1: Build Domain Manager**
- Table of domains with status labels (Verified / Pending).
- Form to add a new domain.
- Instruction modal/section showing the TXT record to add.
- "Check DNS" button to trigger the verification API.

---

### Task 5: Testing

- [ ] **Step 1: Mock DNS test**
Add tests to verify that the API correctly handles DNS success/failure using `vi.mock('dns/promises')`.
