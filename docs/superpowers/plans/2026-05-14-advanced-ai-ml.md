# Advanced AI & ML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement AI-generated flows, sentiment analysis, and a serverless STO model.

**Architecture:**
- Use Claude for flow generation and sentiment.
- Use a dedicated `sto-model/` folder for the Lambda function.

---

### Task 1: AI Flow Generator

**Files:**
- Modify: `flowmail/packages/ai/src/index.ts`
- Create: `flowmail/apps/api/src/routes/ai_flows.ts`

- [ ] **Step 1: Implement `generateFlowGraph` in `@flowmail/ai`**
Use Claude to return a valid JSON object with `nodes` and `edges`.

- [ ] **Step 2: Create API route**
`POST /ai/generate-flow` using the new function.

---

### Task 2: Sentiment Analysis

**Files:**
- Modify: `flowmail/packages/ai/src/index.ts`

- [ ] **Step 1: Implement `analyzeSentiment`**
A simple function to score content quality and intent.

---

### Task 3: Serverless STO Model (Infrastructure)

**Files:**
- Create: `flowmail/sto-model/handler.py`
- Create: `flowmail/sto-model/requirements.txt`

- [ ] **Step 1: Implement Lambda Handler**
Python script to load model and run inference.

- [ ] **Step 2: Mock training**
Provide a small sample model file for initial deployment.

---

### Task 4: Integration

- [ ] **Step 1: Update API to call STO Lambda**
Instead of the internal STO service, the API can now make a signed request to the AWS Lambda function.
