import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPrisma, TenantDB } from '@flowmail/db';
import { apiKeyAuth } from '../middleware/auth';

const compliance = new Hono<{
  Variables: {
    projectId: string;
  };
}>();

compliance.use('*', apiKeyAuth);

const deleteContactSchema = z.object({
  email: z.string().email(),
});

compliance.post('/delete', zValidator('json', deleteContactSchema), async (c) => {
  const { email } = c.req.valid('json');
  const projectId = c.get('projectId');
  const tenantDb = new TenantDB(getPrisma(), projectId);

  try {
    await tenantDb.deleteContact(email);
    return c.json({ success: true, message: `Contact ${email} and all associated data deleted successfully.` });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return c.json({ error: error.message }, 404);
    }
    return c.json({ error: error.message }, 500);
  }
});

export default compliance;
