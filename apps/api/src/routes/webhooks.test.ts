import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import webhooksRouter from './webhooks';
import * as db from '@flowmail/db';

// Mocks
const mockUpsert = vi.fn();
const mockFrom = vi.fn((table) => {
  if (table === 'domains') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { project_id: 'project-123' }, error: null }),
    };
  }
  return {
    upsert: mockUpsert,
  };
});
const mockDbClient = { from: mockFrom };

vi.mock('@flowmail/db', () => ({
  createDbClient: vi.fn(() => mockDbClient),
}));

// Mock fetch globally
global.fetch = vi.fn().mockResolvedValue({ ok: true });

describe('webhooks router', () => {
  let app: Hono;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    app = new Hono();
    app.route('/webhooks', webhooksRouter);

    mockUpsert.mockReset();
    (global.fetch as any).mockClear();
  });

  it('should handle SNS SubscriptionConfirmation', async () => {
    const payload = {
      Type: 'SubscriptionConfirmation',
      SubscribeURL: 'https://sns.amazon.com/confirm?token=123'
    };

    const res = await app.request('/webhooks/ses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('OK');
    expect(global.fetch).toHaveBeenCalledWith('https://sns.amazon.com/confirm?token=123');
  });

  it('should handle SES Bounce notification', async () => {
    const message = JSON.stringify({
      notificationType: 'Bounce',
      bounce: {
        bounceType: 'Permanent',
        bouncedRecipients: [{ emailAddress: 'bounced@example.com' }]
      },
      mail: {
        source: 'sender@verified-domain.com'
      }
    });

    const payload = {
      Type: 'Notification',
      Message: message
    };

    const res = await app.request('/webhooks/ses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('OK');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'bounced@example.com',
        reason: 'bounce',
        project_id: 'project-123'
      }),
      expect.anything()
    );
  });

  it('should handle SES Complaint notification', async () => {
    const message = JSON.stringify({
      notificationType: 'Complaint',
      complaint: {
        complainedRecipients: [{ emailAddress: 'complainer@example.com' }]
      },
      mail: {
        source: 'sender@verified-domain.com'
      }
    });

    const payload = {
      Type: 'Notification',
      Message: message
    };

    const res = await app.request('/webhooks/ses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('OK');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'complainer@example.com',
        reason: 'complaint',
        project_id: 'project-123'
      }),
      expect.anything()
    );
  });
});
