// flowmail/packages/db/src/segmentEvaluator.ts
export interface SegmentRule {
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

export type Condition = AttributeCondition | EventCondition;

export interface AttributeCondition {
  type: 'attribute';
  field: string;
  operator: 'equals' | 'not_equals';
  value: string;
}

export interface EventCondition {
  type: 'event';
  event_name: string;
  operator: 'count_greater_than';
  value: number;
  timeframe_days: number;
}

export class SegmentEvaluator {
  static generateSql(projectId: string, rule: SegmentRule): string {
    const conditionsSql = rule.conditions.map(c => {
      if (c.type === 'attribute') {
        const op = c.operator === 'equals' ? '=' : '!=';
        // Use proper parameterization in real app, simplified for MVP
        return `attributes->>'${c.field}' ${op} '${c.value}'`;
      }
      if (c.type === 'event') {
        return `id IN (
          SELECT contact_id FROM user_events 
          WHERE event_name = '${c.event_name}' 
          AND created_at > NOW() - INTERVAL '${c.timeframe_days} days' 
          GROUP BY contact_id 
          HAVING COUNT(*) > ${c.value}
        )`;
      }
      return '1=1';
    });

    const joinOp = rule.operator === 'AND' ? ' AND ' : ' OR ';
    return `SELECT * FROM contacts WHERE project_id = '${projectId}' AND (${conditionsSql.join(joinOp)})`;
  }
}
