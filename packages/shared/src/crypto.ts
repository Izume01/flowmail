import * as crypto from 'crypto';

/**
 * Signs a URL with a secret using HMAC-SHA256.
 */
export function signUrl(url: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(url).digest('hex');
}

/**
 * Verifies a URL signature using timing-safe comparison.
 */
export function verifyUrlSignature(url: string, signature: string, secret: string): boolean {
  try {
    const expected = signUrl(url, secret);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch (e) {
    return false;
  }
}

/**
 * Generates a webhook signature with timestamp (Stripe-like format: t=timestamp,v1=signature).
 * signature = HMAC-SHA256(timestamp + "." + payload, secret)
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verifies a webhook signature and protects against replay attacks using a tolerance window.
 */
export function verifyWebhookSignature(
  payload: string,
  header: string,
  secret: string,
  tolerance: number = 300
): boolean {
  const parts = header.split(',');
  const tPart = parts.find((p) => p.startsWith('t='));
  const v1Part = parts.find((p) => p.startsWith('v1='));

  if (!tPart || !v1Part) return false;

  const timestampStr = tPart.substring(2);
  const signature = v1Part.substring(3);
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) return false;

  // Check tolerance (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > tolerance) return false;

  const signaturePayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  } catch (e) {
    return false;
  }
}
