import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import track from './track';

// Mocks
const mockFindUnique = vi.fn();

const mockPrisma = {
  email: {
    findUnique: mockFindUnique,
  },
};

vi.mock('@flowmail/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
}));

vi.mock('../services/analytics', () => ({
  queueTrackingEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/webhooks', () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('Track Router', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/track', track);
    vi.clearAllMocks();
  });

  it('GET /track/open/:emailId.png returns a 1x1 GIF', async () => {
    mockFindUnique.mockResolvedValue({
      projectId: 'project-123',
      toEmail: 'test@example.com'
    });

    const res = await app.request('/track/open/123e4567-e89b-12d3-a456-426614174000.png');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/gif');
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
    
    const body = await res.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(0);
    expect(mockFindUnique).toHaveBeenCalled();
  });

  it('GET /track/click redirects to the provided URL with a valid signature', async () => {
    const targetUrl = 'https://example.com';
    const emailId = '123e4567-e89b-12d3-a456-426614174000';
    const secret = process.env.URL_SIGNING_SECRET || 'default_dev_secret';
    
    const { signUrl } = require('@flowmail/shared');
    const sig = signUrl(targetUrl, secret);

    mockFindUnique.mockResolvedValue({
      projectId: 'project-123',
      toEmail: 'test@example.com'
    });

    const res = await app.request(`/track/click?url=${encodeURIComponent(targetUrl)}&emailId=${emailId}&sig=${sig}`);
    
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe(targetUrl);
    expect(mockFindUnique).toHaveBeenCalled();
  });

  it('GET /track/click returns 403 if signature is invalid', async () => {
    const targetUrl = 'https://example.com';
    const res = await app.request(`/track/click?url=${encodeURIComponent(targetUrl)}&emailId=123&sig=invalid`);
    expect(res.status).toBe(403);
    expect(await res.text()).toBe('Invalid Signature');
  });

  it('GET /track/click returns 400 if URL or sig is missing', async () => {
    const res = await app.request('/track/click?emailId=123');
    expect(res.status).toBe(400);
  });
});
