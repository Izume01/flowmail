# FlowMail Deliverability & Safety Core Design

**Goal:** Protect sender reputation by handling SES bounces/complaints and enforcing suppression/cleaning.

**Architecture:**
- **Webhook**: Hono endpoint in `apps/api` to receive SNS notifications.
- **Suppression**: Database table to track blacklisted emails.
- **Validation**: Utility to clean lists before sending.

---

## 1. Database Schema Additions

### `suppressions` Table
Tracks emails that should never be sent to again.
- `id`: UUID (PK)
- `project_id`: UUID (FK)
- `email`: TEXT
- `reason`: TEXT (bounce, complaint, manual)
- `created_at`: TIMESTAMPTZ

### `warmup_configs` Table
Tracks daily volume limits for IP/Domain warming.
- `id`: UUID (PK)
- `project_id`: UUID (FK)
- `daily_limit`: INTEGER
- `current_count`: INTEGER
- `reset_at`: TIMESTAMPTZ

---

## 2. Webhook Handler (`POST /webhooks/ses`)

1. **Verify SNS Signature**: Ensure the request actually comes from AWS.
2. **Handle SubscriptionConfirmation**: Auto-confirm if SNS sends a confirmation request.
3. **Process Notification**:
   - If `notificationType === 'Bounce'`:
     - If `bounceType === 'Permanent'`: Add to `suppressions`.
   - If `notificationType === 'Complaint'`:
     - Add to `suppressions`.
4. **Log Event**: Record the event in a `delivery_events` table for analytics.

---

## 3. Pre-Send Interceptor

Modify `flowmail/apps/api/src/routes/emails.ts`:
1. **Check Suppression**: Before calling SES, check if `to_email` exists in `suppressions`.
2. **Check Warmup**: Verify `current_count < daily_limit`.

---

## 4. List Cleaning Utility

A new service `@flowmail/validator` or in `packages/shared`:
- **Syntax Check**: Zod/Regex.
- **MX Record Check**: Use `dns` module to verify domain exists.
- **Disposable Check**: Block domains like `mailinator.com`.

---

## 5. Testing Strategy
- **Mock SNS**: Send fake JSON payloads to `/webhooks/ses`.
- **Suppression Test**: Try sending to a suppressed email, expect 403/skipped.
- **Warmup Test**: Exceed daily limit, expect 429.
