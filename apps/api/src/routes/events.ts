import { Hono } from 'hono';
import { Client } from "@upstash/workflow";
import { createDbClient, TenantDB } from "@flowmail/db";
import { apiKeyAuth } from '../middleware/auth';

const events = new Hono<{
  Variables: {
    projectId: string;
  };
}>();

events.use('*', apiKeyAuth);

events.post('/', async (c) => {
  const { event, data } = await c.req.json();
  const projectId = c.get('projectId');

  if (!event) {
    return c.json({ error: 'Missing event name' }, 400);
  }

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const tenantDb = new TenantDB(createDbClient(supabaseUrl, supabaseKey), projectId);

  // 1. Fetch active flows for this event and project
  const { data: flows, error } = await tenantDb.getFlowsByTrigger(event);

  if (error) {
    console.error('Error fetching flows:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }

  if (!flows || flows.length === 0) {
    return c.json({ message: 'No active flows found for this event', triggeredCount: 0 });
  }

  // 2. Trigger workflow for each flow
  const workflowClient = new Client({
    baseUrl: process.env.QSTASH_URL,
    token: process.env.QSTASH_TOKEN!,
  });

  const workflowUrl = process.env.UPSTASH_WORKFLOW_URL!;

  if (!workflowUrl) {
    console.error('UPSTASH_WORKFLOW_URL is missing');
    return c.json({ error: 'Internal Server Error' }, 500);
  }

  const triggerPromises = flows.map(flow => 
    workflowClient.trigger({
      url: workflowUrl,
      body: {
        flowId: flow.id,
        projectId: projectId,
        initialData: data || {}
      }
    })
  );

  try {
    await Promise.all(triggerPromises);
    return c.json({ 
      message: `Triggered ${flows.length} flow(s)`, 
      triggeredCount: flows.length 
    });
  } catch (err) {
    console.error('Error triggering workflows:', err);
    return c.json({ error: 'Failed to trigger some flows' }, 500);
  }
});

export default events;
