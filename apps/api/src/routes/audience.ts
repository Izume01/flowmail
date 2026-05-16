import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { identifySchema, trackSchema } from '@flowmail/shared';
import { getPrisma, TenantDB, SegmentEvaluator } from '@flowmail/db';
import { apiKeyAuth } from '../middleware/auth';

const audience = new Hono<{
  Variables: {
    projectId: string;
  };
}>();

audience.use('*', apiKeyAuth);

const getTenantDb = (c: any) => {
  return new TenantDB(getPrisma(), c.get('projectId'));
};

audience.post('/identify', zValidator('json', identifySchema), async (c) => {
  const body = c.req.valid('json');
  const tenantDb = getTenantDb(c);

  try {
    const contact = await tenantDb.upsertContact(
      body.email,
      body.first_name,
      body.last_name,
      body.attributes
    );
    return c.json(contact);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

audience.post('/track', zValidator('json', trackSchema), async (c) => {
  const body = c.req.valid('json');
  const tenantDb = getTenantDb(c);

  try {
    const contact = await tenantDb.upsertContact(body.email);
    const event = await tenantDb.insertUserEvent(contact.id, body.event_name, body.properties);
    
    return c.json({ success: true, eventId: event.id });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

audience.post('/segments', async (c) => {
  const body = await c.req.json();
  const tenantDb = getTenantDb(c);
  
  try {
    const segment = await tenantDb.createSegment(body.name, body.rules);
    return c.json(segment);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

audience.get('/segments/:id/contacts', async (c) => {
  const segmentId = c.req.param('id');
  const tenantDb = getTenantDb(c);
  const projectId = c.get('projectId');
  
  try {
    const segment = await tenantDb.getSegment(segmentId);
    if (!segment) return c.json({ error: 'Segment not found' }, 404);

    const rawSql = SegmentEvaluator.generateSql(projectId, segment.rules as any);
    const contacts = await tenantDb.executeRawQuery(rawSql);
    
    return c.json({ contacts });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default audience;
