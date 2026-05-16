import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import eventsRouter from './events';

// Mocks
const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();

const mockPrisma = {
  project: { findUnique: mockFindUnique },
  flow: { findMany: mockFindMany },
};

vi.mock('@flowmail/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
  TenantDB: class {
    constructor(public prisma: any, public projectId: string) {}
    getFlowsByTrigger = vi.fn(async (type: string) => {
      const flows = await mockPrisma.flow.findMany({ where: { triggerType: type } });
      return flows;
    });
  }
}));

const mockTrigger = vi.fn();
vi.mock('@upstash/workflow', () => ({
  Client: class {
    trigger = mockTrigger;
  }
}));

describe('events router', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/events', eventsRouter);

    mockFindUnique.mockResolvedValue({ id: 'project-123' });
    process.env.UPSTASH_WORKFLOW_URL = 'http://test.com';
  });

  it('should trigger workflows for active flows matching the event', async () => {
    mockFindMany.mockResolvedValue([{ id: 'flow-1' }]);
    mockTrigger.mockResolvedValue({ workflowRunId: 'exec-1' });

    const res = await app.request('/events', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key'
      },
      body: JSON.stringify({ event: 'user_signup', data: { email: 'test@example.com' } })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.triggeredCount).toBe(1);
    expect(mockTrigger).toHaveBeenCalled();
  });

  it('should return 400 if event name is missing', async () => {
    const res = await app.request('/events', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key'
      },
      body: JSON.stringify({ data: {} })
    });

    expect(res.status).toBe(400);
  });
});
