import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import eventsRouter from './events';

// Mock Upstash Workflow Client
const mockTrigger = vi.fn();
vi.mock('@upstash/workflow', () => {
  return {
    Client: vi.fn(() => ({
      trigger: mockTrigger,
    })),
  };
});

// Mock Supabase DB Client
const mockFlowEq = vi.fn();
const mockFlowSelect = vi.fn().mockReturnValue({ eq: mockFlowEq });

const mockFrom = vi.fn((table) => {
  if (table === 'projects') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'project-123' }, error: null }),
    };
  }
  if (table === 'flows') {
    return {
      select: mockFlowSelect,
    };
  }
  return {};
});
const mockDbClient = { from: mockFrom };

vi.mock('@flowmail/db', () => ({
  createDbClient: vi.fn(() => mockDbClient),
}));

describe('events router', () => {
  let app: Hono;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.QSTASH_URL = 'https://qstash.upstash.io';
    process.env.QSTASH_TOKEN = 'test-qstash-token';
    process.env.UPSTASH_WORKFLOW_URL = 'http://localhost:3001/workflow';

    app = new Hono();
    app.route('/', eventsRouter);

    mockTrigger.mockReset();
    mockFlowEq.mockReset();
    mockFlowSelect.mockReset();
    mockFlowSelect.mockReturnValue({ eq: mockFlowEq });
  });

  it('should trigger workflows for active flows matching the event', async () => {
    const chainMock = {
      eq: vi.fn()
    };
    mockFlowSelect.mockReturnValue(chainMock);
    
    chainMock.eq
      .mockReturnValueOnce(chainMock)
      .mockReturnValueOnce(chainMock)
      .mockResolvedValueOnce({
        data: [{ id: 'flow-1' }, { id: 'flow-2' }],
        error: null
      });

    mockTrigger.mockResolvedValue({ messageId: 'msg-id' });

    const res = await app.request('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key'
      },
      body: JSON.stringify({
        event: 'user_signup',
        data: { email: 'test@example.com' }
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.triggeredCount).toBe(2);

    expect(mockTrigger).toHaveBeenCalledTimes(2);
    expect(mockTrigger).toHaveBeenCalledWith(expect.objectContaining({
      url: 'http://localhost:3001/workflow',
      body: {
        flowId: 'flow-1',
        projectId: 'project-123',
        initialData: { email: 'test@example.com' }
      }
    }));
  });

  it('should return 400 if event name is missing', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key'
      },
      body: JSON.stringify({
        data: { email: 'test@example.com' }
      })
    });

    expect(res.status).toBe(400);
  });
});
