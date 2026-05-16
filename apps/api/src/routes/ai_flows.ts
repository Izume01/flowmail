import { Hono } from 'hono';
import { generateFlowGraph } from '@flowmail/ai';
import { apiKeyAuth } from '../middleware/auth';

const aiFlows = new Hono();

aiFlows.use('*', apiKeyAuth);

aiFlows.post('/generate', async (c) => {
  const { prompt } = await c.req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  if (!prompt) {
    return c.json({ error: 'Missing prompt' }, 400);
  }

  try {
    const result = await generateFlowGraph(apiKey, prompt);
    return c.json(result);
  } catch (error: any) {
    console.error('AI flow generation error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default aiFlows;
