import { getPrisma } from '@flowmail/db';
import { generateWebhookSignature } from '@flowmail/shared';
import * as dns from 'dns/promises';

async function isSafeUrl(targetUrl: string): Promise<boolean> {
  try {
    const urlObj = new URL(targetUrl);
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') return false;

    const records = await dns.resolve4(urlObj.hostname);
    for (const ip of records) {
      if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.') || ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function dispatchWebhookEvent(projectId: string, eventType: string, payload: any) {
  try {
    const prisma = getPrisma();

    const configs = await prisma.webhookConfig.findMany({
      where: {
        projectId,
        isActive: true,
      },
    });

    if (!configs || configs.length === 0) return;

    const payloadString = JSON.stringify(payload);

    for (const config of configs) {
      if (!(await isSafeUrl(config.url))) {
        console.warn(`Blocked unsafe webhook delivery attempt to: ${config.url}`);
        continue;
      }

      const signature = generateWebhookSignature(payloadString, config.secretKey);

      try {
        const response = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-FlowMail-Signature': signature,
          },
          body: payloadString,
        });

        await prisma.webhookDelivery.create({
          data: {
            webhookConfigId: config.id,
            eventType,
            payload: payload as any,
            statusCode: response.status,
            attempts: 1,
          },
        });
      } catch (err) {
        console.error(`Failed to dispatch webhook to ${config.url}:`, err);
        await prisma.webhookDelivery.create({
          data: {
            webhookConfigId: config.id,
            eventType,
            payload: payload as any,
            statusCode: 0,
            attempts: 1,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error in webhook dispatcher:', error);
  }
}
