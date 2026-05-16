import { createDbClient } from '@flowmail/db';

export const getBestSendTime = async (recipientEmail: string, projectId: string): Promise<number> => {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createDbClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('emails')
    .select('local_open_hour')
    .eq('to_email', recipientEmail)
    .eq('project_id', projectId);

  if (error || !data || data.length === 0) {
    return 10; // Default: 10 AM
  }

  // Attempt Lambda STO
  const lambdaUrl = process.env.STO_LAMBDA_URL;
  if (lambdaUrl) {
    try {
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          project_id: projectId,
          historical_data: data.map(d => d.local_open_hour).filter(h => h !== null)
        })
      });

      if (response.ok) {
        const result = await response.json() as { best_hour: number };
        if (typeof result.best_hour === 'number') {
          return result.best_hour;
        }
      }
    } catch (e) {
      console.error('STO Lambda error, falling back to local calculation:', e);
    }
  }

  const hourCounts: Record<number, number> = {};
  let maxCount = 0;
  let bestHour = 10;

  for (const row of data) {
    const hour = row.local_open_hour;
    if (hour === null || hour === undefined) continue;
    
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    if (hourCounts[hour] > maxCount) {
      maxCount = hourCounts[hour];
      bestHour = hour;
    }
  }

  return bestHour;
};
