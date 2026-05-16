import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';

// Mock DB Client and TenantDB
const mockTenantDb = {
  upsertContact: vi.fn(),
  insertUserEvent: vi.fn(),
  getFlowsByTrigger: vi.fn(),
  createSegment: vi.fn(),
  getSegment: vi.fn(),
  executeRawQuery: vi.fn(),
};

const mockFrom = vi.fn((table) => {
  if (table === 'projects') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'project-123' }, error: null }),
    };
  }
  return {};
});

const mockDbClient = { from: mockFrom };

vi.mock('@flowmail/db', () => ({
  createDbClient: vi.fn(() => mockDbClient),
  TenantDB: vi.fn(() => mockTenantDb)
}));

import audienceRouter from './audience';

describe('audience router', () => {
  let app: Hono;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    vi.clearAllMocks();
    
    app = new Hono();
    app.route('/audience', audienceRouter);
  });

  describe('POST /identify', () => {
    it('should upsert a contact', async () => {
      mockTenantDb.upsertContact.mockResolvedValue({ data: { id: 'contact-1', email: 'test@example.com' }, error: null });

      const res = await app.request('/audience/identify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({ email: 'test@example.com', first_name: 'John', attributes: { role: 'admin' } })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ id: 'contact-1', email: 'test@example.com' });
      expect(mockTenantDb.upsertContact).toHaveBeenCalledWith('test@example.com', 'John', undefined, { role: 'admin' });
    });

    it('should return 400 for invalid payload', async () => {
      const res = await app.request('/audience/identify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({ name: 'Invalid' })
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /track', () => {
    it('should track an event and upsert contact if needed', async () => {
      mockTenantDb.upsertContact.mockResolvedValue({ data: { id: 'contact-1', email: 'test@example.com' }, error: null });
      mockTenantDb.insertUserEvent.mockResolvedValue({ data: { id: 'event-1' }, error: null });
      mockTenantDb.getFlowsByTrigger.mockResolvedValue({ data: [], error: null });

      const res = await app.request('/audience/track', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({ email: 'test@example.com', event_name: 'button_clicked', properties: { button: 'signup' } })
      });

      expect(res.status).toBe(200);
      expect(mockTenantDb.upsertContact).toHaveBeenCalledWith('test@example.com');
      expect(mockTenantDb.insertUserEvent).toHaveBeenCalledWith('contact-1', 'button_clicked', { button: 'signup' });
    });
  });
});
