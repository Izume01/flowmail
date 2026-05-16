import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import aiRouter from './ai';
import * as ai from '@flowmail/ai';
import * as oracle from '../services/oracle';

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
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    app = new Hono<{ Variables: { projectId: string } }>();
    app.use('*', async (c, next) => {
      c.set('projectId', 'proj-123');
      await next();
    });
    app.route('/', aiRouter);
    vi.clearAllMocks();
  });

  describe('POST /predict', () => {
    it('should return probability result', async () => {
      const mockResult = { probability: 85, factors: ['Test factor'] };
      (oracle.calculateProbability as any).mockResolvedValue(mockResult);

      const res = await app.request('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Test', html: '<p>Test</p>' })
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Test', html: '<p>Test</p>' })
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Missing content');
    });

    it('should return 500 if ANTHROPIC_API_KEY is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const res = await app.request('/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test' })
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('ANTHROPIC_API_KEY not configured');
    });
  });
});
