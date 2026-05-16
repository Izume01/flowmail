import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDeliverabilityScore, improveEmailContent, analyzeSentiment } from '@flowmail/ai';
import { calculateProbability } from '../services/oracle';
import { apiKeyAuth } from '../middleware/auth';
import { getPrisma, TenantDB } from '@flowmail/db';

const ai = new Hono<{
  Variables: {
    projectId: string;
  };
}>();

ai.use('*', apiKeyAuth);

const scoreSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

ai.post('/score', zValidator('json', scoreSchema), async (c) => {
  const { subject, body } = c.req.valid('json');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  try {
    const result = await getDeliverabilityScore(apiKey, subject, body);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

ai.post('/improve', zValidator('json', scoreSchema), async (c) => {
  const { subject, body } = c.req.valid('json');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  try {
    const result = await improveEmailContent(apiKey, subject, body);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

ai.post('/sentiment', zValidator('json', z.object({ content: z.string().min(1) })), async (c) => {
  const { content } = c.req.valid('json');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  try {
    const result = await analyzeSentiment(apiKey, content);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

ai.post('/predict', zValidator('json', z.object({ to: z.string().email(), subject: z.string().optional() })), async (c) => {
  const { to, subject } = c.req.valid('json');
  const projectId = c.get('projectId');
  
  const tenantDb = new TenantDB(getPrisma(), projectId);
  const targetHour = new Date().getUTCHours(); 
  
  try {
    const result = await calculateProbability(tenantDb, to, subject || '', targetHour);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default ai;
