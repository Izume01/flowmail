import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { getBestSendTime } from './sto';
import { createDbClient } from '@flowmail/db';

vi.mock('@flowmail/db', () => ({
  createDbClient: vi.fn(),
}));

describe('STO Service', () => {
  const mockSupabase: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createDbClient as any).mockReturnValue(mockSupabase);
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('returns 10 (default) if no historical data', async () => {
    mockSupabase.eq.mockReturnValueOnce(mockSupabase);
    mockSupabase.eq.mockResolvedValueOnce({ data: [], error: null });
    
    const bestHour = await getBestSendTime('test@example.com', 'project-123');
    expect(bestHour).toBe(10);
  });

  it('returns the most frequent open hour', async () => {
    mockSupabase.eq.mockReturnValueOnce(mockSupabase);
    mockSupabase.eq.mockResolvedValueOnce({
      data: [
        { local_open_hour: 14 },
        { local_open_hour: 14 },
        { local_open_hour: 9 },
      ],
      error: null,
    });
    
    const bestHour = await getBestSendTime('test@example.com', 'project-123');
    expect(bestHour).toBe(14);
  });
});
