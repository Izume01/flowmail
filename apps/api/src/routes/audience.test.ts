import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import audienceRouter from './audience';

// Mocks
const mockFindUnique = vi.fn();

const mockPrisma = {
  project: {
    findUnique: mockFindUnique,
  },
};

const mockUpsertContact = vi.fn();
const mockInsertUserEvent = vi.fn();
const mockGetFlowsByTrigger = vi.fn();
const mockCreateSegment = vi.fn();
const mockGetSegment = vi.fn();
const mockExecuteRawQuery = vi.fn();

vi.mock('@flowmail/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
  TenantDB: class {
    constructor(public prisma: any, public projectId: string) {}
    upsertContact = mockUpsertContact;
    insertUserEvent = mockInsertUserEvent;
    getFlowsByTrigger = mockGetFlowsByTrigger;
    createSegment = mockCreateSegment;
    getSegment = mockGetSegment;
    executeRawQuery = mockExecuteRawQuery;
  },
  SegmentEvaluator: {
    generateSql: vi.fn(() => 'SELECT * FROM contacts'),
  }
}));

describe('audience router', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = new Hono();
    app.route('/audience', audienceRouter);

    // Default mock for API key auth
    mockFindUnique.mockResolvedValue({ id: 'project-123' });
  });

  describe('POST /identify', () => {
    it('should upsert a contact', async () => {
      mockUpsertContact.mockResolvedValue({ id: 'contact-1', email: 'test@example.com' });

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
      expect(mockUpsertContact).toHaveBeenCalledWith('test@example.com', 'John', undefined, { role: 'admin' });
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
      mockUpsertContact.mockResolvedValue({ id: 'contact-1', email: 'test@example.com' });
      mockInsertUserEvent.mockResolvedValue({ id: 'event-1' });

      const res = await app.request('/audience/track', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({ email: 'test@example.com', event_name: 'button_clicked', properties: { button: 'signup' } })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockUpsertContact).toHaveBeenCalledWith('test@example.com');
      expect(mockInsertUserEvent).toHaveBeenCalledWith('contact-1', 'button_clicked', { button: 'signup' });
    });
  });
});
