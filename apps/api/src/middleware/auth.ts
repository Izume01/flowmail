import { Context, Next } from 'hono';
import { getPrisma } from '@flowmail/db';

export const apiKeyAuth = async (c: Context, next: Next) => {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return c.json({ error: 'Missing API Key' }, 401);
  }

  const prisma = getPrisma();

  const project = await prisma.project.findUnique({
    where: {
      apiKey: apiKey,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    return c.json({ error: 'Invalid API Key' }, 401);
  }

  c.set('projectId', project.id);
  await next();
};
