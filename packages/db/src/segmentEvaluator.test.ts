import { SegmentEvaluator, SegmentRule } from './segmentEvaluator';

describe('SegmentEvaluator', () => {
  it('generates correct SQL for attribute conditions', () => {
    const rule: SegmentRule = {
      operator: 'AND',
      conditions: [
        {
          type: 'attribute',
          field: 'plan',
          operator: 'equals',
          value: 'premium'
        }
      ]
    };

    const sql = SegmentEvaluator.generateSql('proj-123', rule);
    expect(sql).toContain("project_id = 'proj-123'");
    expect(sql).toContain("attributes->>'plan' = 'premium'");
  });

  it('generates correct SQL for event conditions', () => {
    const rule: SegmentRule = {
      operator: 'OR',
      conditions: [
        {
          type: 'event',
          event_name: 'login',
          operator: 'count_greater_than',
          value: 5,
          timeframe_days: 30
        }
      ]
    };

    const sql = SegmentEvaluator.generateSql('proj-456', rule);
    expect(sql).toContain("project_id = 'proj-456'");
    expect(sql).toContain("event_name = 'login'");
    expect(sql).toContain("AND created_at > NOW() - INTERVAL '30 days'");
    expect(sql).toContain("HAVING COUNT(*) > 5");
  });
});
