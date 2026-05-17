import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import aiRouter from './ai';
import * as ai from '@flowmail/ai';
import * as oracle from '../services/oracle';

const mockFindUnique = vi.fn();
const mockPrisma = {
  project: { findUnique: mockFindUnique },
};

vi.mock('@flowmail/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
  TenantDB: class {
    constructor(public prisma: any, public projectId: string) {}
  }
}));

vi.mock('@flowmail/ai', () => ({
  getDeliverabilityScore: vi.fn(),
  improveEmailContent: vi.fn(),
  analyzeSentiment: vi.fn(),
}));

vi.mock('../services/oracle', () => ({
  calculateProbability: vi.fn(),
}));

describe('ai router', () => {
  let app: Hono;

  beforeEach(() => {
    process.env.GOOGLE_AI_API_KEY = 'test-key';
    
    mockFindUnique.mockResolvedValue({ id: 'proj-123' });
    
    app = new Hono();
    app.route('/', aiRouter);
    vi.clearAllMocks();
  });

  describe('POST /predict', () => {
    it('should return probability result', async () => {
      const mockResult = { probability: 85, factors: ['Test factor'] };
      (oracle.calculateProbability as any).mockResolvedValue(mockResult);

      const res = await app.request('/predict', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({ to: 'test@example.com', subject: 'Test' })
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockResult);
      expect(oracle.calculateProbability).toHaveBeenCalled();
    });
  });

  describe('POST /score', () => {
    it('should return deliverability score', async () => {
      const mockResult = { score: 90, recommendations: [], spam_triggers: [] };
      (ai.getDeliverabilityScore as any).mockResolvedValue(mockResult);

      const res = await app.request('/score', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({ subject: 'Test', body: 'Test content' })
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockResult);
    });
  });

  describe('POST /improve', () => {
    it('should return improved content', async () => {
      const mockResult = { optimized_subject: 'Better', optimized_body: 'Better', explanation: 'Fixed' };
      (ai.improveEmailContent as any).mockResolvedValue(mockResult);

      const res = await app.request('/improve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({ subject: 'Test', body: 'Test content' })
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockResult);
    });
  });

  describe('POST /sentiment', () => {
    it('should return sentiment analysis', async () => {
      const mockResult = { sentiment: 'positive', score: 0.9, intent: 'informational' };
      (ai.analyzeSentiment as any).mockResolvedValue(mockResult);

      const res = await app.request('/sentiment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({ content: 'I love this product!' })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockResult);
      expect(ai.analyzeSentiment).toHaveBeenCalledWith('test-key', 'I love this product!');
    });

    it('should return 400 if content is missing', async () => {
      const res = await app.request('/sentiment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({})
      });

      expect(res.status).toBe(400);
    });

    it('should return 500 if GOOGLE_AI_API_KEY is missing', async () => {
      delete process.env.GOOGLE_AI_API_KEY;
      const res = await app.request('/sentiment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({ content: 'test' })
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('GOOGLE_AI_API_KEY not configured');
    });
  });
});
