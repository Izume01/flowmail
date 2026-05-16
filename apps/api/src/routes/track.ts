import { Hono } from 'hono';
import { getPrisma } from '@flowmail/db';
import { verifyUrlSignature } from '@flowmail/shared';
import { dispatchWebhookEvent } from '../services/webhooks';
import { queueTrackingEvent } from '../services/analytics';

const track = new Hono();

const TRANSPARENT_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

track.get('/open/:emailId.png', async (c) => {
  const emailId = c.req.param('emailId');
  const tz = c.req.query('tz') || 'UTC';
  
  const prisma = getPrisma();

  try {
    const email = await prisma.email.findUnique({
      where: { id: emailId },
      select: { projectId: true, toEmail: true }
    });

    if (email) {
      queueTrackingEvent('open', emailId, { tz, projectId: email.projectId }).catch(err => 
        console.error('Failed to queue open event:', err)
      );

      dispatchWebhookEvent(email.projectId, 'email.opened', {
        email_id: emailId,
        recipient: email.toEmail,
        timestamp: new Date().toISOString()
      }).catch(err => console.error('Webhook dispatch error:', err));
    }
  } catch (err) {
    console.error('Error in open tracking:', err);
  }

  return c.body(TRANSPARENT_PIXEL, 200, {
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
});

track.get('/click', async (c) => {
  const { url, emailId, sig, tz } = c.req.query();
  
  if (!url || !sig || !emailId) {
    return c.text('Bad Request', 400);
  }

  const secret = process.env.URL_SIGNING_SECRET || 'default_dev_secret';
  if (!verifyUrlSignature(url, sig, secret)) {
    return c.text('Invalid Signature', 403);
  }

  const prisma = getPrisma();

  try {
    const email = await prisma.email.findUnique({
      where: { id: emailId },
      select: { projectId: true, toEmail: true }
    });

    if (email) {
      queueTrackingEvent('click', emailId, { 
        tz: tz || 'UTC', 
        projectId: email.projectId 
      }).catch(err => console.error('Failed to queue click event:', err));

      dispatchWebhookEvent(email.projectId, 'email.clicked', {
        email_id: emailId,
        recipient: email.toEmail,
        url,
        timestamp: new Date().toISOString()
      }).catch(err => console.error('Webhook dispatch error:', err));
    }
  } catch (err) {
    console.error('Error in click tracking:', err);
  }

  return c.redirect(url, 302);
});

export default track;
