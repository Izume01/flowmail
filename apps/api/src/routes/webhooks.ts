import { Hono } from 'hono';
import { getPrisma } from '@flowmail/db';

const webhooks = new Hono();

webhooks.post('/ses', async (c) => {
  const body = await c.req.json();
  const prisma = getPrisma();

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
    
    const domain = await prisma.domain.findFirst({
      where: { domainName: domainName },
      select: { projectId: true }
    });

    const projectId = domain?.projectId;

    if (notificationType === 'Bounce' && msg.bounce.bounceType === 'Permanent') {
      const email = msg.bounce.bouncedRecipients[0].emailAddress;
      if (projectId) {
        await prisma.suppression.upsert({
          where: {
            projectId_email: {
              projectId,
              email
            }
          },
          update: { reason: 'bounce' },
          create: {
            projectId,
            email,
            reason: 'bounce'
          }
        });
      }
    }

    if (notificationType === 'Complaint') {
      const email = msg.complaint.complainedRecipients[0].emailAddress;
      if (projectId) {
        await prisma.suppression.upsert({
          where: {
            projectId_email: {
              projectId,
              email
            }
          },
          update: { reason: 'complaint' },
          create: {
            projectId,
            email,
            reason: 'complaint'
          }
        });
      }
    }
  }

  return c.text('OK');
});

export default webhooks;
