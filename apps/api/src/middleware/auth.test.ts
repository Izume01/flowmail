import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { apiKeyAuth } from './auth';

const mockFindUnique = vi.fn();
const mockPrisma = {
  project: {
    findUnique: mockFindUnique,
  },
};

vi.mock('@flowmail/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
}));

describe('apiKeyAuth middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use('*', apiKeyAuth);
    app.get('/test', (c) => c.json({ projectId: c.get('projectId') }));

    mockFindUnique.mockReset();
  });

  it('should return 401 if X-API-Key header is missing', async () => {
    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('should return 401 if API key is invalid', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await app.request('/test', {
      headers: { 'X-API-Key': 'invalid-key' }
    });
    expect(res.status).toBe(401);
  });

  it('should set projectId in context if API key is valid', async () => {
    mockFindUnique.mockResolvedValue({ id: 'project-123' });

    const res = await app.request('/test', {
      headers: { 'X-API-Key': 'valid-key' }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.projectId).toBe('project-123');
  });
});
