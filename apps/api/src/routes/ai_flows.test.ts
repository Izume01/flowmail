import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import aiFlowsRouter from './ai_flows';

// Mocks
const mockFindUnique = vi.fn();
const mockPrisma = {
  project: { findUnique: mockFindUnique },
};

vi.mock('@flowmail/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
}));

const mockGenerateFlowGraph = vi.fn();
vi.mock('@flowmail/ai', () => ({
  generateFlowGraph: mockGenerateFlowGraph,
}));

describe('AI Flows Router', () => {
  let app: Hono;

  beforeEach(() => {
    process.env.GOOGLE_AI_API_KEY = 'test-key';
    app = new Hono();
    app.route('/ai/flows', aiFlowsRouter);
    
    mockFindUnique.mockResolvedValue({ id: 'project-123' });
    mockGenerateFlowGraph.mockReset();
  });

  it('POST /ai/flows/generate should return generated graph', async () => {
    const mockGraph = { nodes: [], edges: [] };
    mockGenerateFlowGraph.mockResolvedValue(mockGraph);

    const res = await app.request('/ai/flows/generate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key'
      },
      body: JSON.stringify({ prompt: 'Test onboarding' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(mockGraph);
  });

  it('should return 400 if prompt is missing', async () => {
    const res = await app.request('/ai/flows/generate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key'
      },
      body: JSON.stringify({})
    });

    expect(res.status).toBe(400);
  });
});
