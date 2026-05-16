import { describe, it, expect } from 'bun:test';
import { signUrl, verifyUrlSignature, generateWebhookSignature, verifyWebhookSignature } from './crypto';

describe('crypto utilities', () => {
  const secret = 'test_secret';
  const url = 'https://example.com/foo?bar=baz';

  it('signs a URL and produces a hex string', () => {
    const sig = signUrl(url, secret);
    expect(sig).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex is 64 chars
  });

  it('verifies a valid signature', () => {
    const sig = signUrl(url, secret);
    expect(verifyUrlSignature(url, sig, secret)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const sig = signUrl(url, secret);
    expect(verifyUrlSignature(url, sig + 'x', secret)).toBe(false);
  });

  it('rejects a signature from a different secret', () => {
    const sig = signUrl(url, 'wrong_secret');
    expect(verifyUrlSignature(url, sig, secret)).toBe(false);
  });

  it('rejects a signature for a different URL', () => {
    const sig = signUrl(url, secret);
    expect(verifyUrlSignature(url + '/other', sig, secret)).toBe(false);
  });

  describe('webhook signatures', () => {
    const payload = JSON.stringify({ event: 'test', id: '123' });

    it('generates a signature in the correct format', () => {
      const header = generateWebhookSignature(payload, secret);
      expect(header).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    });

    it('verifies a valid signature', () => {
      const header = generateWebhookSignature(payload, secret);
      expect(verifyWebhookSignature(payload, header, secret)).toBe(true);
    });

    it('rejects an invalid signature', () => {
      const header = generateWebhookSignature(payload, secret);
      const invalidHeader = header.replace('v1=', 'v1=extra');
      expect(verifyWebhookSignature(payload, invalidHeader, secret)).toBe(false);
    });

    it('rejects a signature with wrong payload', () => {
      const header = generateWebhookSignature(payload, secret);
      expect(verifyWebhookSignature(payload + 'x', header, secret)).toBe(false);
    });

    it('rejects a signature with wrong secret', () => {
      const header = generateWebhookSignature(payload, secret);
      expect(verifyWebhookSignature(payload, header, 'wrong_secret')).toBe(false);
    });

    it('rejects an expired signature (tolerance)', () => {
      // Create a signature from 10 minutes ago
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const signaturePayload = `${oldTimestamp}.${payload}`;
      const signature = require('crypto').createHmac('sha256', secret).update(signaturePayload).digest('hex');
      const header = `t=${oldTimestamp},v1=${signature}`;

      expect(verifyWebhookSignature(payload, header, secret, 300)).toBe(false);
    });

    it('accepts a signature within tolerance', () => {
      // Create a signature from 2 minutes ago
      const timestamp = Math.floor(Date.now() / 1000) - 120;
      const signaturePayload = `${timestamp}.${payload}`;
      const signature = require('crypto').createHmac('sha256', secret).update(signaturePayload).digest('hex');
      const header = `t=${timestamp},v1=${signature}`;

      expect(verifyWebhookSignature(payload, header, secret, 300)).toBe(true);
    });
  });
});
