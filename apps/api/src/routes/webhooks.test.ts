import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import webhooksRouter from './webhooks';

// Mocks
const mockUpsert = vi.fn();
const mockFindFirst = vi.fn();

const mockPrisma = {
  domain: {
    findFirst: mockFindFirst,
  },
  suppression: {
    upsert: mockUpsert,
  },
};

vi.mock('@flowmail/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
}));

// Mock fetch globally
global.fetch = vi.fn().mockResolvedValue({ ok: true });

describe('webhooks router', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/webhooks', webhooksRouter);

    mockUpsert.mockReset();
    mockFindFirst.mockReset();
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
    mockFindFirst.mockResolvedValue({ projectId: 'project-123' });

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
        where: {
          projectId_email: {
            projectId: 'project-123',
            email: 'bounced@example.com'
          }
        },
        create: expect.objectContaining({
          reason: 'bounce'
        })
      })
    );
  });

  it('should handle SES Complaint notification', async () => {
    mockFindFirst.mockResolvedValue({ projectId: 'project-123' });

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
        where: {
          projectId_email: {
            projectId: 'project-123',
            email: 'complainer@example.com'
          }
        },
        create: expect.objectContaining({
          reason: 'complaint'
        })
      })
    );
  });
});
