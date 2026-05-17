import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPrisma, TenantDB } from '@flowmail/db';
import { apiKeyAuth } from '../middleware/auth';
import { verifyDomainDNS } from '../services/dns';
import * as crypto from 'crypto';

const domains = new Hono<{
  Variables: {
    projectId: string;
  };
}>();

domains.use('*', apiKeyAuth);

const getTenantDb = (c: any) => {
  return new TenantDB(getPrisma(), c.get('projectId'));
};

const addDomainSchema = z.object({
  domainName: z.string().min(3),
});

domains.get('/', async (c) => {
  const tenantDb = getTenantDb(c);
  try {
    const list = await tenantDb.getDomains();
    return c.json(list);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

domains.post('/', zValidator('json', addDomainSchema), async (c) => {
  const { domainName } = c.req.valid('json');
  const tenantDb = getTenantDb(c);

  // Generate verification token
  const token = `fm_${crypto.randomUUID().replace(/-/g, '')}`;

  try {
    const domain = await tenantDb.addDomain(domainName, token);
    return c.json(domain);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

domains.post('/:id/verify', async (c) => {
  const id = c.req.param('id');
  const tenantDb = getTenantDb(c);

  try {
    const domain = await tenantDb.getDomain(id);
    if (!domain) return c.json({ error: 'Domain not found' }, 404);
    if (domain.isVerified) return c.json({ message: 'Domain already verified', domain });

    const isVerified = await verifyDomainDNS(domain.domainName, domain.verificationToken);

    if (isVerified) {
      const updated = await tenantDb.updateDomainVerification(id, true);
      return c.json({ success: true, message: 'Domain verified successfully', domain: updated });
    } else {
      return c.json({ success: false, message: 'DNS verification failed. TXT record not found or incorrect.' }, 400);
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default domains;
