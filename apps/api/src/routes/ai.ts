import { Hono } from 'hono';
import { getDeliverabilityScore, improveEmailContent, analyzeSentiment } from '@flowmail/ai';
import { createDbClient, TenantDB } from '@flowmail/db';
import { calculateProbability } from '../services/oracle';

type Variables = {
  projectId: string;
};

const ai = new Hono<{ Variables: Variables }>();

ai.post('/predict', async (c) => {
  const body = await c.req.json();
  const projectId = c.get('projectId');
  
  if (!projectId) {
    return c.json({ error: 'Project ID missing' }, 400);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return c.json({ error: 'Database configuration missing' }, 500);
  }

  const tenantDb = new TenantDB(createDbClient(supabaseUrl, supabaseKey), projectId);
  
  let targetHour = new Date().getUTCHours(); 
  if (body.send_time) {
    const d = new Date(body.send_time);
    if (!isNaN(d.getTime())) {
      targetHour = d.getHours();
    }
  }
  
  const result = await calculateProbability(tenantDb, body.to, body.subject, targetHour);
  return c.json(result);
});

ai.post('/score', async (c) => {
  const { subject, html } = await c.req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  if (!subject || !html) {
    return c.json({ error: 'Missing subject or html' }, 400);
  }

  try {
    const result = await getDeliverabilityScore(apiKey, subject, html);
    return c.json(result);
  } catch (error: any) {
    console.error('AI scoring error:', error);
    return c.json({ error: error.message }, 500);
  }
});

ai.post('/improve', async (c) => {
  const { subject, html } = await c.req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  if (!subject || !html) {
    return c.json({ error: 'Missing subject or html' }, 400);
  }

  try {
    const result = await improveEmailContent(apiKey, subject, html);
    return c.json(result);
  } catch (error: any) {
    console.error('AI improvement error:', error);
    return c.json({ error: error.message }, 500);
  }
});

ai.post('/sentiment', async (c) => {
  const { content } = await c.req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  if (!content) {
    return c.json({ error: 'Missing content' }, 400);
  }

  try {
    const result = await analyzeSentiment(apiKey, content);
    return c.json(result);
  } catch (error: any) {
    console.error('AI sentiment analysis error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default ai;
