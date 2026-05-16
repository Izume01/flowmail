# FlowMail Advanced AI & ML Design

**Goal:** Enhance the platform with generative flows and a robust ML model for timing optimization.

**Architecture:**
- **Flow Generator**: A specialized Claude prompt that outputs React Flow JSON.
- **Sentiment Service**: Analyzes email content/feedback for user intent.
- **Serverless ML**: An AWS Lambda function running a LightGBM model for STO.

---

## 1. AI Flow Generator

**Input:** User prompt (e.g., "Welcome email sequence for a new SaaS user").
**System Prompt:**
- "You are a FlowMail Architect. Generate a valid React Flow JSON graph."
- "Available nodes: trigger, send_email, wait, condition."
- "Output JSON only."

**Endpoint:** `POST /ai/generate-flow` in `apps/api`.

---

## 2. Sentiment Analysis

**Input:** Raw email text or bounce reason.
**Output:** `{ sentiment: 'positive' | 'negative' | 'neutral', urgency: 0-10, intent: string }`.

**Integration:**
- Call this when a webhook receives a "reply" event (future) or when a human logs in to view feedback.

---

## 3. Serverless LightGBM STO

**Model Training:**
1. Use `scripts/export_logs.ts` to get a CSV of `(recipient_id, day_of_week, hour, opened_flag)`.
2. Train a LightGBM classification model.
3. Export the model to a `.bin` or `.json` file.

**Inference Deployment:**
- **Runtime:** AWS Lambda (Python 3.11).
- **Package:** `lightgbm`, `numpy`.
- **Logic:**
  1. Receive `recipient_history` and `current_time`.
  2. For each hour in the next 24, predict `open_probability`.
  3. Return the hour with the highest score.

---

## 4. Testing Strategy
- **Flow Generator**: Verify the output JSON can be loaded by `@xyflow/react`.
- **ML Inference**: Unit test the Lambda handler with a dummy model.
