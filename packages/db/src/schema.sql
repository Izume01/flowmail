-- flowmail/packages/db/src/schema.sql

-- Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domains Table
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emails Table
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  status TEXT DEFAULT 'pending',
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  variant_id UUID,
  local_open_hour INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking A/B test variants and their stats
CREATE TABLE email_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  sends INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flows table to store the graph
CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- e.g., 'user_signup', 'custom_event'
  graph JSONB NOT NULL, -- stores { nodes: [], edges: [], viewport: {} }
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts Table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, email)
);

-- User Events Table
CREATE TABLE user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_project_email ON contacts(project_id, email);
CREATE INDEX idx_user_events_contact_id ON user_events(contact_id);

-- Executions to track progress
CREATE TABLE flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running', -- running, completed, failed
  context_data JSONB DEFAULT '{}', -- data passed to the flow
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC Functions for tracking
CREATE OR REPLACE FUNCTION increment_opens(email_id UUID, user_timezone TEXT DEFAULT 'UTC')
RETURNS void AS $$
DECLARE
  v_id UUID;
  v_local_hour INTEGER;
BEGIN
  -- Calculate local hour based on current time and provided timezone
  BEGIN
    v_local_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE user_timezone))::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    v_local_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'UTC'))::INTEGER;
  END;

  -- Update email stats
  UPDATE emails
  SET 
    opens = COALESCE(opens, 0) + 1,
    local_open_hour = v_local_hour
  WHERE id = email_id
  RETURNING variant_id INTO v_id;

  -- Update variant stats if exists
  IF v_id IS NOT NULL THEN
    PERFORM increment_variant_opens(v_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_clicks(email_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE emails
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = email_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_variant_sends(variant_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE email_variants
  SET sends = COALESCE(sends, 0) + 1
  WHERE id = variant_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_variant_opens(variant_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE email_variants
  SET opens = COALESCE(opens, 0) + 1
  WHERE id = variant_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION bulk_increment_stats(p_email_id UUID, p_opens INTEGER, p_clicks INTEGER)
RETURNS VOID AS $$
DECLARE
  v_variant_id UUID;
BEGIN
  UPDATE emails 
  SET 
    opens = COALESCE(opens, 0) + p_opens,
    clicks = COALESCE(clicks, 0) + p_clicks
  WHERE id = p_email_id
  RETURNING variant_id INTO v_variant_id;

  IF v_variant_id IS NOT NULL AND p_opens > 0 THEN
    UPDATE email_variants
    SET opens = COALESCE(opens, 0) + p_opens
    WHERE id = v_variant_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

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

-- Webhook Configuration
CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Delivery Tracking
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_configs_project_id ON webhook_configs(project_id);
CREATE INDEX idx_webhook_deliveries_config_id ON webhook_deliveries(webhook_config_id);

-- Agency Configs for White-Labeling
CREATE TABLE agency_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  custom_domain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  brand_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agency_configs_domain ON agency_configs(custom_domain);

-- Idempotency Keys for Workflow Executions
CREATE TABLE idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segments Table
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rules JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimize JSONB querying
CREATE INDEX idx_contacts_attributes ON contacts USING GIN (attributes);
CREATE INDEX idx_user_events_properties ON user_events USING GIN (properties);

CREATE OR REPLACE FUNCTION execute_segment_query(p_query TEXT)
RETURNS SETOF contacts AS $$
BEGIN
  RETURN QUERY EXECUTE p_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

