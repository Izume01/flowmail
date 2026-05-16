import { Hono } from 'hono';
import { createDbClient } from '@flowmail/db';
import { verifyUrlSignature } from '@flowmail/shared';
import { dispatchWebhookEvent } from '../services/webhooks';
import { queueTrackingEvent } from '../services/analytics';

const track = new Hono();

const TRANSPARENT_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

track.get('/open/:emailId.png', async (c) => {
  const emailId = c.req.param('emailId');
  const tz = c.req.query('tz') || 'UTC';
  
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createDbClient(supabaseUrl, supabaseKey);

  try {
    // We still need email info for the webhook
    const { data: email } = await supabase
      .from('emails')
      .select('project_id, to_email')
      .eq('id', emailId)
      .single();

    // Queue the event instead of direct DB RPC
    queueTrackingEvent('open', emailId, { tz }).catch(err => 
      console.error('Failed to queue open event:', err)
    );

    if (email?.project_id) {
      // Background dispatch
      dispatchWebhookEvent(email.project_id, 'email.opened', {
        email_id: emailId,
        recipient: email.to_email,
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
  const { url, emailId, sig } = c.req.query();
  
  if (!url || !sig) {
    return c.text('Bad Request', 400);
  }

  const secret = process.env.URL_SIGNING_SECRET || 'default_dev_secret';
  if (!verifyUrlSignature(url, sig, secret)) {
    return c.text('Invalid Signature', 403);
  }

  if (emailId) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createDbClient(supabaseUrl, supabaseKey);

    try {
      const { data: email } = await supabase
        .from('emails')
        .select('project_id, to_email')
        .eq('id', emailId)
        .single();

      // Queue the event instead of direct DB RPC
      queueTrackingEvent('click', emailId, { url }).catch(err => 
        console.error('Failed to queue click event:', err)
      );

      if (email?.project_id) {
        // Background dispatch
        dispatchWebhookEvent(email.project_id, 'email.clicked', {
          email_id: emailId,
          recipient: email.to_email,
          url,
          timestamp: new Date().toISOString()
        }).catch(err => console.error('Webhook dispatch error:', err));
      }
    } catch (err) {
      console.error('Error in click tracking:', err);
    }
  }

  return c.redirect(url);
});

export default track;
