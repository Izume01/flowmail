import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import emailsRouter from './emails';
import * as db from '@flowmail/db';
import * as email from '@flowmail/email';

// Mocks
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockFrom = vi.fn((table) => {
  if (table === 'projects') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'project-123' }, error: null }),
    };
  }
  return {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
  };
});
const mockRpc = vi.fn();
const mockDbClient = { from: mockFrom, rpc: mockRpc };

vi.mock('@flowmail/db', () => ({
  createDbClient: vi.fn(() => mockDbClient),
}));

vi.mock('@flowmail/email', () => ({
  createEmailClient: vi.fn(),
  sendEmail: vi.fn(),
}));

describe('emails router', () => {
  let app: Hono;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-id';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

    app = new Hono();
    // In actual app, we'd mount this at /emails
    // For test, we mount it at root or use the router directly
    app.route('/', emailsRouter);

    mockInsert.mockReset();
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null })
    });
    mockUpdate.mockReset();
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null })
    });
    mockRpc.mockReset();
    (email.sendEmail as any).mockReset();
  });

  it('should send email and update database successfully', async () => {
    // Mock DB rpc (not suppressed)
    mockRpc.mockResolvedValue({ data: false, error: null });

    // Mock DB insert
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null })
    });

    // Mock Email send
    (email.sendEmail as any).mockResolvedValue({ MessageId: 'msg-123' });

    // Mock DB update
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'email-123', status: 'sent' }, error: null })
    });

    const res = await app.request('/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key'
      },
      body: JSON.stringify({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Hello',
        text: 'World'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('email-123');
    expect(data.status).toBe('sent');

    expect(mockInsert).toHaveBeenCalled();
    expect(email.sendEmail).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' }));
  });

  it('should return 403 Forbidden if the email is suppressed', async () => {
    // Mock DB rpc (is suppressed)
    mockRpc.mockResolvedValue({ data: true, error: null });

    const res = await app.request('/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key'
      },
      body: JSON.stringify({
        from: 'test@example.com',
        to: 'suppressed@example.com',
        subject: 'Hello',
        text: 'World'
      })
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Email is suppressed');
    expect(mockRpc).toHaveBeenCalledWith('is_email_suppressed', {
      p_project_id: 'project-123',
      p_email: 'suppressed@example.com'
    });
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('should return 500 if the suppression check fails', async () => {
    // Mock DB rpc error
    mockRpc.mockResolvedValue({ data: null, error: new Error('DB Error') });

    const res = await app.request('/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key'
      },
      body: JSON.stringify({
        from: 'test@example.com',
        to: 'error@example.com',
        subject: 'Hello',
        text: 'World'
      })
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to verify recipient status');
  });

  it('should handle email sending failure', async () => {
    // Mock DB rpc (not suppressed)
    mockRpc.mockResolvedValue({ data: false, error: null });

    // Mock DB insert
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null })
    });

    // Mock Email send failure
    (email.sendEmail as any).mockRejectedValue(new Error('SES Error'));

    // Mock DB update for failure
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'email-123', status: 'failed' }, error: null })
    });

    const res = await app.request('/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key'
      },
      body: JSON.stringify({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Hello',
        text: 'World'
      })
    });

    expect(res.status).toBe(500); 
    const data = await res.json();
    expect(data.status).toBe('failed');
    expect(data.success).toBe(false);
    
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('should return 400 for invalid input', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key'
      },
      body: JSON.stringify({
        from: 'invalid-email',
        to: 'recipient@example.com',
        subject: 'Hello'
      })
    });

    expect(res.status).toBe(400);
  });
});
