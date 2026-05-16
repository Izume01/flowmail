import { Hono } from 'hono';
import { getPrisma, TenantDB } from '@flowmail/db';
import { apiKeyAuth } from '../middleware/auth';

const flows = new Hono<{
  Variables: {
    projectId: string;
  };
}>();

flows.use('*', apiKeyAuth);

const getTenantDb = (c: any) => {
  return new TenantDB(getPrisma(), c.get('projectId'));
};

flows.get('/:id/suggestions', async (c) => {
  const flowId = c.req.param('id');
  const tenantDb = getTenantDb(c);

  try {
    const suggestions = await tenantDb.getFlowSuggestions(flowId);
    return c.json(suggestions);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default flows;
