// packages/db/src/index.ts
import { createClient } from '@supabase/supabase-js';

export * from './dal';
export * from './segmentEvaluator';

export const createDbClient = (url: string, key: string) => {
  return createClient(url, key);
};

export interface Flow {
  id: string;
  project_id: string;
  name: string;
  trigger_type: string;
  graph: {
    nodes: any[];
    edges: any[];
    viewport?: any;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlowExecution {
  id: string;
  flow_id: string;
  project_id: string;
  status: 'running' | 'completed' | 'failed';
  context_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Email {
  id: string;
  project_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body_html?: string | null;
  body_text?: string | null;
  status: string;
  opens: number;
  clicks: number;
  variant_id?: string | null;
  local_open_hour?: number | null;
  created_at: string;
}

export interface Variant {
  id: string;
  project_id: string;
  subject: string;
  body_html?: string | null;
  body_text?: string | null;
  sends: number;
  opens: number;
  is_winner: boolean;
  created_at: string;
}
