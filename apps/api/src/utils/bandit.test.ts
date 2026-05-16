import { describe, expect, it } from 'bun:test';
import { pickVariant } from './bandit';

describe('bandit', () => {
  it('should pick the only variant if only one is provided', () => {
    const variants = [
      { id: '1', sends: 100, opens: 50, subject: 'A' }
    ];
    const picked = pickVariant(variants);
    expect(picked.id).toBe('1');
  });

  it('should statistically pick the better variant more often', () => {
    const variants = [
      { id: '1', sends: 100, opens: 10, subject: 'A' }, // 10%
      { id: '2', sends: 100, opens: 80, subject: 'B' }  // 80%
    ];

    let v1Count = 0;
    let v2Count = 0;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const picked = pickVariant(variants);
      if (picked.id === '1') v1Count++;
      else v2Count++;
    }

    expect(v2Count).toBeGreaterThan(v1Count);
  });
});
