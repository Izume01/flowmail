# FlowMail React Email Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate React Email for professional templates, updating `@flowmail/email` to support JSX rendering.

**Architecture:** Use `@react-email/components` for building templates and `@react-email/render` to convert JSX to HTML strings. Update the base package to provide a clean `renderTemplate` utility.

**Tech Stack:** React, `@react-email/components`, `@react-email/render`.

---

### Task 1: Setup Dependencies

**Files:**
- Modify: `flowmail/packages/email/package.json`

- [ ] **Step 1: Install dependencies**

Run: `cd flowmail/packages/email && bun add @react-email/components @react-email/render react react-dom`
Run: `cd flowmail/packages/email && bun add -d @types/react @types/react-dom`

- [ ] **Step 2: Commit**

```bash
git add flowmail/packages/email/package.json
git commit -m "chore(email): add react-email and react dependencies"
```

---

### Task 2: Create Base Template

**Files:**
- Create: `flowmail/packages/email/src/templates/BaseTemplate.tsx`

- [ ] **Step 1: Implement BaseTemplate**

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BaseTemplateProps {
  previewText?: string;
  heading?: string;
  content: string;
}

export const BaseTemplate = ({
  previewText = "Welcome to FlowMail",
  heading,
  content,
}: BaseTemplateProps) => (
  <Html>
    <Head />
    <Preview>{previewText}</Preview>
    <Body style={main}>
      <Container style={container}>
        {heading && <Heading style={h1}>{heading}</Heading>}
        <Section>
          <Text style={text}>{content}</Text>
        </Section>
        <Section>
          <Text style={footer}>
            Sent via FlowMail - The Ultimate AI Email Layer
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "580px",
};

const h1 = {
  color: "#1d1c1d",
  fontSize: "24px",
  fontWeight: "700",
  margin: "30px 0",
  padding: "0",
  lineHeight: "42px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
};

const footer = {
  color: "#898989",
  fontSize: "12px",
  lineHeight: "22px",
  marginTop: "12px",
};
```

- [ ] **Step 2: Commit**

```bash
git add flowmail/packages/email/src/templates/BaseTemplate.tsx
git commit -m "feat(email): add React Email BaseTemplate"
```

---

### Task 3: Implement render utility and update index

**Files:**
- Modify: `flowmail/packages/email/src/index.ts`

- [ ] **Step 1: Update index.ts with renderTemplate**

```typescript
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { render } from "@react-email/render";
import * as React from "react";

/**
 * Initialize SES Client
 */
export const createEmailClient = (region: string, accessKeyId: string, secretAccessKey: string) => {
  return new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
};

/**
 * Render a React Email template to HTML
 */
export const renderTemplate = (component: React.ReactElement): string => {
  return render(component);
};

/**
 * Send email using SES
 */
export const sendEmail = async (
  client: SESClient,
  from: string,
  to: string,
  subject: string,
  html?: string,
  text?: string
) => {
  const command = new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Message: {
      Body: {
        ...(html && { Html: { Data: html, Charset: "UTF-8" } }),
        ...(text && { Text: { Data: text, Charset: "UTF-8" } }),
      },
      Subject: { Data: subject, Charset: "UTF-8" },
    },
    Source: from,
  });
  return client.send(command);
};

/**
 * Send templated email
 */
export const sendTemplatedEmail = async (
  client: SESClient,
  from: string,
  to: string,
  subject: string,
  component: React.ReactElement
) => {
  const html = renderTemplate(component);
  return sendEmail(client, from, to, subject, html);
};

export * from "./templates/BaseTemplate";
```

- [ ] **Step 2: Commit**

```bash
git add flowmail/packages/email/src/index.ts
git commit -m "feat(email): add renderTemplate and sendTemplatedEmail utilities"
```

---

### Task 4: Verification

**Files:**
- Create: `flowmail/packages/email/src/verify.test.ts`

- [ ] **Step 1: Write verification test**

```typescript
import { expect, test } from "bun:test";
import * as React from "react";
import { renderTemplate } from "./index";
import { BaseTemplate } from "./templates/BaseTemplate";

test("renders BaseTemplate to HTML", () => {
  const html = renderTemplate(
    React.createElement(BaseTemplate, {
      heading: "Test Heading",
      content: "Test Content",
    })
  );
  
  expect(html).toContain("<!DOCTYPE html");
  expect(html).toContain("Test Heading");
  expect(html).toContain("Test Content");
  expect(html).toContain("FlowMail");
});
```

- [ ] **Step 2: Run verification**

Run: `cd flowmail/packages/email && bun test src/verify.test.ts`
Expected: PASS

- [ ] **Step 3: Cleanup verification test**

Run: `rm flowmail/packages/email/src/verify.test.ts`

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "test(email): verify react-email rendering works"
```
