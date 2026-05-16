-- flowmail/packages/db/src/deliverability.sql

-- Suppression list
CREATE TABLE suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT NOT NULL, -- 'bounce', 'complaint', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, email)
);

-- IP Warmup tracking
CREATE TABLE warmup_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  daily_limit INTEGER NOT NULL DEFAULT 50,
  current_count INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Index for fast lookup
CREATE INDEX idx_suppressions_email ON suppressions(email);

-- RPC for checking suppression
CREATE OR REPLACE FUNCTION is_email_suppressed(p_project_id UUID, p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM suppressions 
    WHERE project_id = p_project_id AND email = p_email
  );
END;
$$ LANGUAGE plpgsql;
