import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import emailsRouter from './emails';
import * as email from '@flowmail/email';

// Mocks
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockQueryRaw = vi.fn();
const mockExecuteRaw = vi.fn();

const mockPrisma = {
  project: {
    findUnique: mockFindUnique,
  },
  email: {
    findFirst: mockFindFirst,
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
  },
  emailVariant: {
    findMany: vi.fn(),
  },
  $queryRaw: mockQueryRaw,
  $executeRaw: mockExecuteRaw,
};

vi.mock('@flowmail/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
  TenantDB: class {
    constructor(public prisma: any, public projectId: string) {}
    getEmails = vi.fn((limit) => this.prisma.email.findMany({ take: limit }));
    isEmailSuppressed = vi.fn((email) => this.prisma.$queryRaw().then((res: any) => res[0]?.exists || false));
    insertEmail = vi.fn((data) => this.prisma.email.create({ data }));
    updateEmailStatus = vi.fn((id, status) => this.prisma.email.update({ where: { id }, data: { status } }));
    getEmailVariants = vi.fn(() => this.prisma.emailVariant.findMany());
    incrementVariantSends = vi.fn((id) => this.prisma.$executeRaw());
  },
}));

vi.mock('@flowmail/email', () => ({
  createEmailClient: vi.fn(),
  sendEmail: vi.fn(),
}));

describe('emails router', () => {
  let app: Hono;

  beforeEach(() => {
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-id';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

    app = new Hono();
    app.route('/', emailsRouter);

    vi.clearAllMocks();
    
    // Default mock for API key auth (in apiKeyAuth middleware)
    mockFindUnique.mockResolvedValue({ id: 'project-123' });
  });

  it('should send email and update database successfully', async () => {
    // Mock DB isEmailSuppressed (via $queryRaw)
    mockQueryRaw.mockResolvedValue([{ exists: false }]);

    // Mock DB insertEmail (via prisma.email.create)
    mockCreate.mockResolvedValue({ id: 'email-123' });

    // Mock Email send
    (email.sendEmail as any).mockResolvedValue({ MessageId: 'msg-123' });

    // Mock DB updateEmailStatus (via prisma.email.update)
    mockUpdate.mockResolvedValue({ id: 'email-123', status: 'sent' });

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

    expect(mockCreate).toHaveBeenCalled();
    expect(email.sendEmail).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'sent' }
    }));
  });

  it('should return 403 Forbidden if the email is suppressed', async () => {
    // Mock DB isEmailSuppressed (via $queryRaw)
    mockQueryRaw.mockResolvedValue([{ exists: true }]);

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
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('should return 500 if the suppression check fails', async () => {
    // Mock DB queryRaw error
    mockQueryRaw.mockRejectedValue(new Error('DB Error'));

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
    // Mock DB isEmailSuppressed
    mockQueryRaw.mockResolvedValue([{ exists: false }]);

    // Mock DB insertEmail
    mockCreate.mockResolvedValue({ id: 'email-123' });

    // Mock Email send failure
    (email.sendEmail as any).mockRejectedValue(new Error('SES Error'));

    // Mock DB update for failure
    mockUpdate.mockResolvedValue({ id: 'email-123', status: 'failed' });

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
    
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'failed' }
    }));
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
