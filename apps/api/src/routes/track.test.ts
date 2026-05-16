import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import track from './track';

// Mock @flowmail/db
vi.mock('@flowmail/db', () => ({
  createDbClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ error: null }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}));

// Mock analytics service
vi.mock('../services/analytics', () => ({
  queueTrackingEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('Track Router', () => {
  const app = new Hono();
  app.route('/track', track);

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('GET /track/open/:emailId.png returns a 1x1 GIF', async () => {
    const res = await app.request('/track/open/123e4567-e89b-12d3-a456-426614174000.png');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/gif');
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
    
    const body = await res.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(0);
  });

  it('GET /track/click redirects to the provided URL with a valid signature', async () => {
    const targetUrl = 'https://example.com';
    const emailId = '123e4567-e89b-12d3-a456-426614174000';
    const secret = process.env.URL_SIGNING_SECRET || 'default_dev_secret';
    
    // We need to import signUrl or just mock the verification
    // Since we're testing the integration, let's use the real crypto if possible
    // or just mock the shared package.
    // For now, let's assume the app uses the secret.
    const sig = require('@flowmail/shared').signUrl(targetUrl, secret);

    const res = await app.request(`/track/click?url=${encodeURIComponent(targetUrl)}&emailId=${emailId}&sig=${sig}`);
    
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe(targetUrl);
  });

  it('GET /track/click returns 403 if signature is invalid', async () => {
    const targetUrl = 'https://example.com';
    const res = await app.request(`/track/click?url=${encodeURIComponent(targetUrl)}&sig=invalid`);
    expect(res.status).toBe(403);
    expect(await res.text()).toBe('Invalid Signature');
  });

  it('GET /track/click returns 400 if URL or sig is missing', async () => {
    const res = await app.request('/track/click?emailId=123');
    expect(res.status).toBe(400);
  });
});
