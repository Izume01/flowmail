import { Hono } from 'hono';
import { createDbClient } from '@flowmail/db';

const webhooks = new Hono();

webhooks.post('/ses', async (c) => {
  const body = await c.req.json();
  const supabase = createDbClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Handle SNS SubscriptionConfirmation
  if (body.Type === 'SubscriptionConfirmation') {
    await fetch(body.SubscribeURL);
    return c.text('OK');
  }

  if (body.Type === 'Notification') {
    const msg = JSON.parse(body.Message);
    const notificationType = msg.notificationType;
    const mail = msg.mail;
    
    // Attempt to find project_id from the sender's domain
    const source = mail.source;
    const domainName = source.split('@')[1];
    
    const { data: domain } = await supabase
      .from('domains')
      .select('project_id')
      .eq('domain_name', domainName)
      .limit(1)
      .maybeSingle();

    const projectId = domain?.project_id;

    if (notificationType === 'Bounce' && msg.bounce.bounceType === 'Permanent') {
      const email = msg.bounce.bouncedRecipients[0].emailAddress;
      await supabase.from('suppressions').upsert({
        project_id: projectId,
        email,
        reason: 'bounce'
      }, { onConflict: 'project_id,email' });
    }

    if (notificationType === 'Complaint') {
      const email = msg.complaint.complainedRecipients[0].emailAddress;
      await supabase.from('suppressions').upsert({
        project_id: projectId,
        email,
        reason: 'complaint'
      }, { onConflict: 'project_id,email' });
    }
  }

  return c.text('OK');
});

export default webhooks;
