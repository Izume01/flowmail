import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test';
import { dispatchWebhookEvent } from './webhooks';
import { createDbClient } from '@flowmail/db';
import { createHmac } from 'crypto';

// Mocks
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'delivery-123' }, error: null });
const mockEq = vi.fn().mockReturnThis();

const mockConfigs = [
  {
    id: 'config-1',
    url: 'https://webhook.site/1',
    secret_key: 'secret-1',
    is_active: true
  }
];

const mockFrom = vi.fn((table) => {
  if (table === 'webhook_configs') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (callback: any) => callback({ data: mockConfigs, error: null })
    };
  }
  if (table === 'webhook_deliveries') {
    return {
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
      update: mockUpdate,
      eq: mockEq
    };
  }
  return {};
});

const mockDbClient = { from: mockFrom };

vi.mock('@flowmail/db', () => ({
  createDbClient: vi.fn(() => mockDbClient),
}));

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
global.fetch = mockFetch;

describe('Webhook Service', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    vi.clearAllMocks();
  });

  it('should dispatch webhook event and record delivery', async () => {
    const projectId = 'project-123';
    const type = 'test.event';
    const payload = { foo: 'bar' };

    await dispatchWebhookEvent(projectId, type, payload);

    // Verify configs fetch
    expect(mockFrom).toHaveBeenCalledWith('webhook_configs');
    
    // Verify insert delivery
    expect(mockFrom).toHaveBeenCalledWith('webhook_deliveries');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      event_type: type,
      attempts: 1
    }));

    // Verify fetch call
    expect(mockFetch).toHaveBeenCalled();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://webhook.site/1');
    expect(options.method).toBe('POST');
    expect(options.headers).toHaveProperty('X-FlowMail-Signature');
    expect(options.headers).not.toHaveProperty('X-FlowMail-Timestamp');

    // Verify signature format (t=...,v1=...)
    const signature = options.headers['X-FlowMail-Signature'];
    expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);

    const parts = signature.split(',');
    const timestamp = parts[0].substring(2);
    const sigValue = parts[1].substring(3);
    const body = options.body;
    
    const expectedSignature = createHmac('sha256', 'secret-1')
      .update(`${timestamp}.${body}`)
      .digest('hex');
    expect(sigValue).toBe(expectedSignature);

    // Verify update delivery status
    expect(mockUpdate).toHaveBeenCalledWith({ status_code: 200 });
  });

  it('should not dispatch if no active configs', async () => {
    // Mock no configs
    mockFrom.mockImplementationOnce((table) => {
      if (table === 'webhook_configs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (callback: any) => callback({ data: [], error: null })
        };
      }
      return {};
    });

    await dispatchWebhookEvent('p1', 'type', {});
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should block webhooks to local or private IPs (SSRF protection)', async () => {
    const unsafeConfigs = [
      { id: 'c1', url: 'http://localhost/hit', secret_key: 's1', is_active: true },
      { id: 'c2', url: 'http://127.0.0.1/hit', secret_key: 's2', is_active: true },
      { id: 'c3', url: 'http://169.254.169.254/latest/meta-data/', secret_key: 's3', is_active: true },
      { id: 'c4', url: 'http://192.168.1.1/admin', secret_key: 's4', is_active: true },
    ];

    // Mock configs fetch returning unsafe ones
    mockFrom.mockImplementation((table) => {
      if (table === 'webhook_configs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (callback: any) => callback({ data: unsafeConfigs, error: null })
        };
      }
      if (table === 'webhook_deliveries') {
        return {
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
          update: mockUpdate,
          eq: mockEq
        };
      }
      return {};
    });

    await dispatchWebhookEvent('project-123', 'test.event', {});

    // Should NOT have called fetch for any of these
    expect(mockFetch).not.toHaveBeenCalled();
    
    // Should still have recorded "failed" deliveries (status_code 403 or similar, or just not updated)
    // Actually, according to the plan: "log a delivery failure and continue"
    // We should probably mark them with a specific status code if we block them.
  });

  it('should allow webhooks to valid external URLs', async () => {
    const validConfigs = [
      { id: 'c1', url: 'https://api.github.com/webhook', secret_key: 's1', is_active: true },
      { id: 'c2', url: 'https://hooks.slack.com/services/xxx', secret_key: 's2', is_active: true },
    ];

    mockFrom.mockImplementation((table) => {
      if (table === 'webhook_configs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (callback: any) => callback({ data: validConfigs, error: null })
        };
      }
      if (table === 'webhook_deliveries') {
        return {
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
          update: mockUpdate,
          eq: mockEq
        };
      }
      return {};
    });

    await dispatchWebhookEvent('project-123', 'test.event', {});

    // Should have called fetch for both
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
