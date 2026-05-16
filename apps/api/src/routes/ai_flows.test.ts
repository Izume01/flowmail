import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import aiFlowsRouter from './ai_flows';
import * as ai from '@flowmail/ai';

vi.mock('@flowmail/ai', () => ({
  generateFlowGraph: vi.fn(),
}));

describe('ai_flows router', () => {
  let app: Hono;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    app = new Hono();
    app.route('/', aiFlowsRouter);
    vi.clearAllMocks();
  });

  it('should generate a flow graph successfully', async () => {
    const mockGraph = {
      nodes: [{ id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }],
      edges: []
    };
    (ai.generateFlowGraph as any).mockResolvedValue(mockGraph);

    const res = await app.request('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Welcome flow' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(mockGraph);
    expect(ai.generateFlowGraph).toHaveBeenCalledWith('test-key', 'Welcome flow');
  });

  it('should return 400 if prompt is missing', async () => {
    const res = await app.request('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing prompt');
  });

  it('should return 500 if ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await app.request('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Welcome flow' })
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('ANTHROPIC_API_KEY not configured');
  });

  it('should return 500 if generateFlowGraph fails', async () => {
    (ai.generateFlowGraph as any).mockRejectedValue(new Error('AI failure'));

    const res = await app.request('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Welcome flow' })
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('AI failure');
  });
});
