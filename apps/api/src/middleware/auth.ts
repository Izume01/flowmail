import { Context, Next } from 'hono';
import { createDbClient } from '@flowmail/db';

export const apiKeyAuth = async (c: Context, next: Next) => {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return c.json({ error: 'Missing API Key' }, 401);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration missing');
    return c.json({ error: 'Internal Server Error' }, 500);
  }

  const supabase = createDbClient(supabaseUrl, supabaseKey);

  const { data: project, error } = await supabase
    .from('projects')
    .select('id')
    .eq('api_key', apiKey)
    .single();

  if (error || !project) {
    return c.json({ error: 'Invalid API Key' }, 401);
  }

  c.set('projectId', project.id);
  await next();
};
