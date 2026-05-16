import { createDbClient } from '@flowmail/db';
import { generateWebhookSignature } from '@flowmail/shared';
import * as crypto from 'crypto';
import * as dns from 'dns/promises';
import { isIP } from 'net';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function isSafeUrl(targetUrl: string): Promise<boolean> {
  try {
    const urlObj = new URL(targetUrl);
    const hostname = urlObj.hostname;

    // If it's already an IP, check it directly
    if (isIP(hostname)) {
      return isSafeIP(hostname);
    }

    // Basic local check for common hostnames
    if (hostname === 'localhost') return false;

    // Resolve hostnames to IPs to check against private ranges
    // Note: This only checks IPv4. In production, consider IPv6 as well.
    const records = await dns.resolve4(hostname);
    for (const ip of records) {
      if (!isSafeIP(ip)) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

function isSafeIP(ip: string): boolean {
  // Loopback
  if (ip === '127.0.0.1' || ip === '::1') return false;
  
  // Private IPs
  // 10.0.0.0/8
  if (ip.startsWith('10.')) return false;
  // 172.16.0.0/12
  if (ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) return false;
  // 192.168.0.0/16
  if (ip.startsWith('192.168.')) return false;
  
  // Link-local / Metadata
  // 169.254.0.0/16
  if (ip.startsWith('169.254.')) return false;

  return true;
}

export async function dispatchWebhookEvent(projectId: string, type: string, payload: any) {
  const supabase = createDbClient(supabaseUrl, supabaseKey);

  // Fetch active webhook configs for this project
  const { data: configs, error } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching webhook configs:', error);
    return;
  }

  if (!configs || configs.length === 0) {
    return;
  }

  const timestamp = Date.now();
  const eventPayload = {
    id: crypto.randomUUID(),
    type,
    created_at: new Date(timestamp).toISOString(),
    data: payload
  };

  const payloadString = JSON.stringify(eventPayload);

  await Promise.all(configs.map(async (config) => {
    // SSRF Protection check
    if (!(await isSafeUrl(config.url))) {
      console.warn(`Blocked unsafe webhook delivery attempt to: ${config.url}`);
      
      // Record failed delivery attempt
      await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_config_id: config.id,
          event_type: type,
          payload: eventPayload,
          attempts: 1,
          status_code: 403 // Forbidden/Blocked
        });
        
      return;
    }

    const signature = generateWebhookSignature(payloadString, config.secret_key);

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_config_id: config.id,
        event_type: type,
        payload: eventPayload,
        attempts: 1
      })
      .select()
      .single();

    if (deliveryError) {
      console.error('Error creating webhook delivery record:', deliveryError);
      return;
    }

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FlowMail-Signature': signature
        },
        body: payloadString
      });

      // Update delivery with status code
      await supabase
        .from('webhook_deliveries')
        .update({ status_code: response.status })
        .eq('id', delivery.id);

    } catch (err) {
      console.error(`Error sending webhook to ${config.url}:`, err);
      // Status code will remain null on network error
    }
  }));
}
