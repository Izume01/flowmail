import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { rateLimiter } from 'hono-rate-limiter';
import { log } from '@flowmail/shared';
import emails from './routes/emails';
import events from './routes/events';
import track from './routes/track';
import billing from './routes/billing';
import ai from './routes/ai';
import aiFlows from './routes/ai_flows';
import flows from './routes/flows';
import webhooks from './routes/webhooks';
import audience from './routes/audience';
import { auth } from '@flowmail/auth';
import { flowWorkflow } from './routes/workflows';

const app = new Hono();

app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

app.use('*', logger());

const limiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: "draft-6",
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'global',
});

app.get('/', (c) => {
  return c.text('FlowMail API v1');
});

app.use('/emails/*', limiter);
app.use('/track/*', limiter);
app.use('/audience/*', limiter);

app.route('/emails', emails);
app.route('/events', events);
app.route('/track', track);
app.route('/billing', billing);
app.route('/ai', ai);
app.route('/ai/flows', aiFlows);
app.route('/flows', flows);
app.route('/webhooks', webhooks);
app.route('/audience', audience);
app.post('/workflow', flowWorkflow);

log.info('FlowMail API started', { port: 3001 });

export default {
  port: 3001,
  fetch: app.fetch,
};
