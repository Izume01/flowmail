# AI Model Strategy: Custom Send Time Optimization (STO)

This document outlines the strategy for moving from a simple heuristic-based STO (best-hour average) to a custom machine learning model.

## Goal
Predict the probability of a specific recipient opening an email at a specific hour of the day to maximize engagement.

## Data Features
The model will use the following features:
- `recipient_id_hash`: Hashed email to capture individual behavior.
- `project_id`: To capture project-specific engagement patterns (e.g., B2B vs B2C).
- `hour_of_day`: The target hour (0-23).
- `day_of_week`: To capture weekend vs weekday behavior.
- `historical_open_rate`: Recipient's overall open rate.
- `last_open_delta`: Time since last open.

## Model Architecture
- **Type**: Gradient Boosted Decision Trees (GBDT).
- **Library**: LightGBM or XGBoost (efficient for tabular data).
- **Target**: Binary classification (`is_opened`) or Regression (`open_probability`).

## Implementation Plan

### Phase 1: Data Collection (Current)
- Tracking `local_open_hour` for every open event.
- Exporting logs to JSON/CSV via `scripts/export_logs.ts`.

### Phase 2: Training Pipeline
1. **Preprocessing**: 
   - Convert timestamps to `hour_of_day` and `day_of_week`.
   - Aggregate history per recipient.
2. **Training**:
   - Train a LightGBM model on the exported logs.
   - Use a 80/20 train/test split.
3. **Evaluation**:
   - Measure AUC-ROC and Precision@K.

### Phase 3: Serving
- Export model to ONNX format.
- Deploy as a sidecar microservice (FastAPI/Python) or use an Edge Runtime with ONNX support.
- API Endpoint: `POST /predict` 
  - Input: `{ recipient_email, project_id, candidate_hours: [0...23] }`
  - Output: `{ best_hour: 14, probabilities: [...] }`

## Future Enhancements
- **Content-aware STO**: Include email subject keywords as features.
- **Contextual Bandits**: Use online learning to adapt to changing user behavior in real-time.
