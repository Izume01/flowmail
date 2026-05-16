import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { sendEmailSchema, isValidRecipient } from '@flowmail/shared';
import { getPrisma, TenantDB } from '@flowmail/db';
import { createEmailClient, sendEmail } from '@flowmail/email';
import { apiKeyAuth } from '../middleware/auth';
import { pickVariant, type Variant } from '../utils/bandit';

const emails = new Hono<{
  Variables: {
    projectId: string;
  };
}>();

emails.use('*', apiKeyAuth);

emails.get('/', async (c) => {
  const projectId = c.get('projectId');
  const tenantDb = new TenantDB(getPrisma(), projectId);

  try {
    const logs = await tenantDb.getEmails(10);
    return c.json(logs);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

emails.post('/', zValidator('json', sendEmailSchema), async (c) => {
  const body = c.req.valid('json');
  const projectId = c.get('projectId');

  if (!isValidRecipient(body.to)) {
    return c.json({ error: 'Disposable email domains are not allowed' }, 400);
  }

  const tenantDb = new TenantDB(getPrisma(), projectId);

  // Pre-send check: Is email suppressed?
  let isSuppressed = false;
  try {
    isSuppressed = await tenantDb.isEmailSuppressed(body.to);
  } catch (err) {
    return c.json({ error: 'Failed to verify recipient status' }, 500);
  }

  if (isSuppressed) {
    return c.json({ error: 'Email is suppressed' }, 403);
  }

  // 0. Handle A/B Testing if subject is missing
  let finalSubject = body.subject;
  let finalHtml = body.html;
  let finalText = body.text;
  let variantId: string | undefined;

  if (!finalSubject) {
    const variants = await tenantDb.getEmailVariants();

    if (variants && variants.length > 0) {
      const picked = pickVariant(variants as Variant[]);
      finalSubject = picked.subject;
      finalHtml = picked.body_html || undefined;
      finalText = picked.body_text || undefined;
      variantId = picked.id;

      // Increment sends for the variant
      await tenantDb.incrementVariantSends(variantId);
    } else {
      return c.json({ error: 'Subject is required when no A/B variants are found' }, 400);
    }
  }

  // 1. Log email as pending
  try {
    const emailRecord = await tenantDb.insertEmail({
      from_email: body.from,
      to_email: body.to,
      subject: finalSubject,
      body_html: finalHtml,
      body_text: finalText,
      status: 'pending',
      variant_id: variantId
    });

    // 2. Send email via SES
    const sesRegion = process.env.AWS_REGION!;
    const sesAccessKeyId = process.env.AWS_ACCESS_KEY_ID!;
    const sesSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!;

    const emailClient = createEmailClient(sesRegion, sesAccessKeyId, sesSecretAccessKey);

    try {
      await sendEmail(
        emailClient,
        body.from,
        body.to,
        finalSubject!,
        finalHtml,
        finalText
      );

      // 3. Update status to sent
      await tenantDb.updateEmailStatus(emailRecord.id, 'sent');

      return c.json({ 
        success: true, 
        message: 'Email sent', 
        id: emailRecord.id,
        status: 'sent'
      });
    } catch (error) {
      console.error('Failed to send email:', error);

      // 4. Update status to failed
      await tenantDb.updateEmailStatus(emailRecord.id, 'failed');

      return c.json({ 
        success: false,
        error: 'Failed to send email', 
        id: emailRecord.id,
        status: 'failed'
      }, 500);
    }
  } catch (logError) {
    console.error('Failed to log email:', logError);
    return c.json({ error: 'Failed to process email' }, 500);
  }
});

export default emails;
