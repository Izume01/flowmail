import { TenantDB } from '@flowmail/db';

export async function calculateProbability(tenantDb: TenantDB, email: string, subject: string, targetHourLocal: number) {
  const stats = await tenantDb.getRecipientStats(email);
  
  if (stats.length === 0) {
    return { probability: 45, factors: ["No historical data. Using global average."] };
  }

  let probability = 50; // base
  const factors = [];

  const opens = stats.filter((s: any) => s.opens > 0);
  const openRate = opens.length / stats.length;
  
  if (openRate > 0.5) {
    probability += 20;
    factors.push("High historical engagement");
  } else if (openRate === 0) {
    probability -= 15;
    factors.push("Recipient rarely opens emails");
  }

  // Find most frequent open hour
  const hours = opens.map((o: any) => o.local_open_hour).filter((h: any) => h !== null);
  if (hours.length > 0) {
    const modeHour = hours.sort((a: any, b: any) => hours.filter((v: any) => v===a).length - hours.filter((v: any) => v===b).length).pop() ?? 0;
    
    // Circular distance: min(|a-b|, 24 - |a-b|)
    const rawDiff = Math.abs(modeHour - targetHourLocal);
    const distance = Math.min(rawDiff, 24 - rawDiff);

    if (distance <= 2) {
      probability += 15;
      factors.push(`Sending close to preferred hour (${modeHour}:00)`);
    } else {
      probability -= 10;
      factors.push(`Sending off-peak (preferred: ${modeHour}:00)`);
    }
  }

  // Subject length heuristic
  if (subject && subject.length > 10 && subject.length < 50) {
    probability += 5;
    factors.push("Subject length is optimal");
  }

  return { probability: Math.min(Math.max(probability, 0), 99), factors };
}