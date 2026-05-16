import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { identifySchema, trackSchema } from '@flowmail/shared';
import { apiKeyAuth } from '../middleware/auth';
import { createDbClient, TenantDB, SegmentEvaluator } from '@flowmail/db';
import { Client } from "@upstash/workflow";

const router = new Hono<{
  Variables: {
    projectId: string;
  };
}>();

router.use('*', apiKeyAuth);

function getTenantDb(c: any) {
  const projectId = c.get('projectId');
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'key';
  return new TenantDB(createDbClient(supabaseUrl, supabaseKey), projectId);
}

router.post('/identify', zValidator('json', identifySchema), async (c) => {
  const body = c.req.valid('json');
  const tenantDb = getTenantDb(c);

  const { data, error } = await tenantDb.upsertContact(
    body.email,
    body.first_name,
    body.last_name,
    body.attributes
  );

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

router.post('/track', zValidator('json', trackSchema), async (c) => {
  const body = c.req.valid('json');
  const tenantDb = getTenantDb(c);

  // Find or create the contact using upsertContact
  const { data: contact, error: contactError } = await tenantDb.upsertContact(body.email);

  if (contactError || !contact) {
    return c.json({ error: contactError?.message || 'Contact not found' }, 500);
  }

  // Insert the user event
  const { data: event, error: eventError } = await tenantDb.insertUserEvent(
    contact.id,
    body.event_name,
    body.properties
  );

  if (eventError) {
    return c.json({ error: eventError.message }, 500);
  }

  // Bonus: Call Upstash Workflow Client logic if flows are listening to event_name
  const { data: flows, error: flowsError } = await tenantDb.getFlowsByTrigger(body.event_name);
  if (!flowsError && flows && flows.length > 0) {
    const workflowClient = new Client({
      baseUrl: process.env.QSTASH_URL,
      token: process.env.QSTASH_TOKEN!,
    });
  
    const workflowUrl = process.env.UPSTASH_WORKFLOW_URL!;
    if (workflowUrl) {
      const triggerPromises = flows.map(flow => 
        workflowClient.trigger({
          url: workflowUrl,
          body: {
            flowId: flow.id,
            projectId: c.get('projectId'),
            initialData: body.properties || {}
          }
        })
      );
      try {
        await Promise.all(triggerPromises);
      } catch (err) {
        console.error('Error triggering workflows:', err);
      }
    }
  }

  return c.json(event);
});

router.post('/segments', async (c) => {
  const body = await c.req.json();
  const tenantDb = getTenantDb(c);
  
  const { data, error } = await tenantDb.createSegment(body.name, body.rules);
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

router.get('/segments/:id/contacts', async (c) => {
  const segmentId = c.req.param('id');
  const projectId = c.get('projectId');
  const tenantDb = getTenantDb(c);
  
  const { data: segment, error: segmentError } = await tenantDb.getSegment(segmentId);
  if (segmentError || !segment) {
    return c.json({ error: segmentError?.message || 'Segment not found' }, 404);
  }

  const rawSql = SegmentEvaluator.generateSql(projectId, segment.rules);
  const { data: contacts, error: queryError } = await tenantDb.executeRawQuery(rawSql);
  
  if (queryError) {
    return c.json({ error: queryError.message }, 500);
  }
  
  return c.json({ contacts });
});

export default router;
