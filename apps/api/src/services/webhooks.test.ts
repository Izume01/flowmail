import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { dispatchWebhookEvent } from './webhooks';
import { getPrisma } from '@flowmail/db';
import { generateWebhookSignature } from '@flowmail/shared';

// Mock DNS
vi.mock('dns/promises', () => ({
  resolve4: vi.fn(async (hostname: string) => {
    if (hostname === 'localhost' || hostname === '127.0.0.1') return ['127.0.0.1'];
    if (hostname === '169.254.169.254') return ['169.254.169.254'];
    if (hostname === '192.168.1.1') return ['192.168.1.1'];
    return ['93.184.216.34']; // example.com
  }),
}));

// Mocks
const mockPrisma = {
  webhookConfig: {
    findMany: vi.fn(),
  },
  webhookDelivery: {
    create: vi.fn(),
  },
};

vi.mock('@flowmail/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
}));

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
global.fetch = mockFetch;

describe('Webhook Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.webhookConfig.findMany.mockResolvedValue([
      {
        id: 'config-1',
        url: 'https://webhook.site/1',
        secretKey: 'secret-1',
        isActive: true
      }
    ]);
    mockPrisma.webhookDelivery.create.mockResolvedValue({ id: 'delivery-123' });
  });

  it('should dispatch webhook event and record delivery', async () => {
    const projectId = 'project-123';
    const type = 'test.event';
    const payload = { foo: 'bar' };

    await dispatchWebhookEvent(projectId, type, payload);

    // Verify configs fetch
    expect(mockPrisma.webhookConfig.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId, isActive: true }
    }));
    
    // Verify fetch call
    expect(mockFetch).toHaveBeenCalled();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://webhook.site/1');
    expect(options.method).toBe('POST');
    expect(options.headers).toHaveProperty('X-FlowMail-Signature');

    // Verify signature
    const signature = options.headers['X-FlowMail-Signature'];
    const expectedSignature = generateWebhookSignature(JSON.stringify(payload), 'secret-1');
    expect(signature).toBe(expectedSignature);

    // Verify insert delivery
    expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        webhookConfigId: 'config-1',
        eventType: type,
        statusCode: 200
      })
    }));
  });

  it('should not dispatch if no active configs', async () => {
    mockPrisma.webhookConfig.findMany.mockResolvedValueOnce([]);

    await dispatchWebhookEvent('p1', 'type', {});
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should block webhooks to local or private IPs (SSRF protection)', async () => {
    mockPrisma.webhookConfig.findMany.mockResolvedValue([
      { id: 'c1', url: 'http://localhost/hit', secretKey: 's1', isActive: true },
      { id: 'c2', url: 'http://127.0.0.1/hit', secretKey: 's2', isActive: true },
      { id: 'c3', url: 'http://169.254.169.254/latest/meta-data/', secretKey: 's3', isActive: true },
      { id: 'c4', url: 'http://192.168.1.1/admin', secretKey: 's4', isActive: true },
    ]);

    await dispatchWebhookEvent('project-123', 'test.event', {});

    // Should NOT have called fetch for any of these
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should allow webhooks to valid external URLs', async () => {
    mockPrisma.webhookConfig.findMany.mockResolvedValue([
      { id: 'c1', url: 'https://api.github.com/webhook', secretKey: 's1', isActive: true },
      { id: 'c2', url: 'https://hooks.slack.com/services/xxx', secretKey: 's2', isActive: true },
    ]);

    await dispatchWebhookEvent('project-123', 'test.event', {});

    // Should have called fetch for both
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
