import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { getBestSendTime } from './sto';
import { getPrisma } from '@flowmail/db';

const mockPrisma = {
  email: {
    findMany: vi.fn(),
  },
};

vi.mock('@flowmail/db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
}));

describe('STO Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 10 (default) if no historical data', async () => {
    mockPrisma.email.findMany.mockResolvedValue([]);
    
    const bestHour = await getBestSendTime('test@example.com', 'project-123');
    expect(bestHour).toBe(10);
  });

  it('returns the most frequent open hour', async () => {
    mockPrisma.email.findMany.mockResolvedValue([
      { localOpenHour: 14 },
      { localOpenHour: 14 },
      { localOpenHour: 9 },
    ]);
    
    const bestHour = await getBestSendTime('test@example.com', 'project-123');
    expect(bestHour).toBe(14);
  });
});
