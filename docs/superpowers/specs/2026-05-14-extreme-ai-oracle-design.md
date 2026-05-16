# FlowMail Extreme AI - The Oracle Design

**Goal:** Provide real-time "Likelihood of Open" predictions and cached content scoring before a user sends an email.

**Architecture:**
- **Prediction Endpoint**: A new Hono route `/ai/predict` that calculates the open probability.
- **Data Source**: Uses historical data from Supabase (via DAL) for the recipient. If missing, uses global averages.
- **Model**: For Phase 9 MVP, we will simulate the LightGBM probability using a heuristic algorithm (e.g., recency of last open + alignment with their `best_hour`). In a real prod environment, this calls the Lambda.
- **UI Integration**: The `TestSendForm` will be updated to fetch and display this prediction instantly when the user types an email address.

---

## 1. Probability Algorithm (MVP)

Instead of a heavy Lambda cold-start for UI predictions, we use a fast heuristic based on the STO data:
1. Fetch recipient's `local_open_hour` distribution.
2. Determine how close the *current* time is to their peak hour.
3. Combine with a baseline open rate for the project.
4. Scale 0-100%.

## 2. API Endpoint (`POST /ai/predict`)

**Input:**
```json
{
  "to": "user@example.com",
  "subject": "Hello",
  "send_time": "2026-05-14T14:00:00Z" // optional, defaults to now
}
```

**Output:**
```json
{
  "probability": 82,
  "best_time_local": "14:00",
  "factors": ["Matches historical open time", "Subject length is optimal"]
}
```

---

## 3. UI Dashboard Updates

- Add a "Prediction Oracle" card next to the `TestSendForm`.
- Use a debounced effect: when the user finishes typing the `to` email and `subject`, automatically fetch `/api/ai/predict`.
- Display a gauge or large percentage number.
