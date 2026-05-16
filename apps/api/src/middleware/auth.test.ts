import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { apiKeyAuth } from './auth';

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockDbClient = { from: mockFrom };

vi.mock('@flowmail/db', () => ({
  createDbClient: vi.fn(() => mockDbClient),
}));

describe('apiKeyAuth middleware', () => {
  let app: Hono;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    
    app = new Hono();
    app.use('*', apiKeyAuth);
    app.get('/test', (c) => c.json({ projectId: c.get('projectId') }));

    mockSingle.mockReset();
    mockFrom.mockClear();
  });

  it('should return 401 if X-API-Key header is missing', async () => {
    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('should return 401 if API key is invalid', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('Not found') });

    const res = await app.request('/test', {
      headers: { 'X-API-Key': 'invalid-key' }
    });
    expect(res.status).toBe(401);
  });

  it('should set projectId in context if API key is valid', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'project-123' }, error: null });

    const res = await app.request('/test', {
      headers: { 'X-API-Key': 'valid-key' }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.projectId).toBe('project-123');
  });
});
