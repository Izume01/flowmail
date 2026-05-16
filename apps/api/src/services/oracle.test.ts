import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { calculateProbability } from './oracle';
import { TenantDB } from '@flowmail/db';

describe('Oracle Service', () => {
  let mockTenantDb: any;

  beforeEach(() => {
    mockTenantDb = {
      getRecipientStats: vi.fn(),
    };
  });

  it('returns 45 probability and global average factor if no historical data', async () => {
    mockTenantDb.getRecipientStats.mockResolvedValue([]);
    
    const result = await calculateProbability(mockTenantDb as TenantDB, 'test@example.com', 'short', 10);
    
    expect(result.probability).toBe(45);
    expect(result.factors).toContain('No historical data. Using global average.');
  });

  it('calculates probability correctly with historical data', async () => {
    mockTenantDb.getRecipientStats.mockResolvedValue([
      { status: 'delivered', opens: 1, local_open_hour: 10 },
      { status: 'delivered', opens: 1, local_open_hour: 10 },
      { status: 'delivered', opens: 0, local_open_hour: null }
    ]);
    
    const result = await calculateProbability(mockTenantDb as TenantDB, 'test@example.com', 'this is an optimal subject', 10);
    
    // openRate = 2/3 > 0.5 (+20) -> base 50 + 20 = 70
    // preferred hour = 10, distance 0 <= 2 (+15) -> 70 + 15 = 85
    // subject length = 26 (+5) -> 85 + 5 = 90
    expect(result.probability).toBe(90);
    expect(result.factors).toContain('High historical engagement');
    expect(result.factors).toContain('Sending close to preferred hour (10:00)');
    expect(result.factors).toContain('Subject length is optimal');
  });

  it('penalizes for rarely opening emails and sending off-peak', async () => {
    mockTenantDb.getRecipientStats.mockResolvedValue([
      { status: 'delivered', opens: 0, local_open_hour: null },
      { status: 'delivered', opens: 0, local_open_hour: null }
    ]);
    
    // subject is too short to give +5
    const result = await calculateProbability(mockTenantDb as TenantDB, 'test@example.com', 'short', 10);
    
    // openRate = 0 (-15) -> base 50 - 15 = 35
    expect(result.probability).toBe(35);
    expect(result.factors).toContain('Recipient rarely opens emails');
  });
});
