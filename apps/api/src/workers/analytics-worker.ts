import { Redis } from '@upstash/redis';
import { getPrisma } from '@flowmail/db';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const prisma = getPrisma();

async function processBatch() {
  console.log(`[${new Date().toISOString()}] Worker: Checking for events...`);
  try {
    const events: any[] | null = await redis.rpop('analytics_queue', 1000);
    
    if (!events || events.length === 0) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Worker: Processing ${events.length} events...`);
    const aggregations: Record<string, { opens: number; clicks: number, projectId: string }> = {};

    for (const raw of events) {
      let event;
      try {
        event = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        console.error('Worker: Failed to parse event', raw);
        continue;
      }
      
      if (!event.emailId || !event.projectId) continue;

      if (!aggregations[event.emailId]) {
        aggregations[event.emailId] = { opens: 0, clicks: 0, projectId: event.projectId };
      }
      if (event.type === 'open') aggregations[event.emailId].opens++;
      if (event.type === 'click') aggregations[event.emailId].clicks++;
    }

    const emailIds = Object.keys(aggregations);
    console.log(`[${new Date().toISOString()}] Worker: Aggregated into ${emailIds.length} unique emails.`);

    for (const emailId of emailIds) {
      const stats = aggregations[emailId];
      try {
        await prisma.$executeRawUnsafe(
          'SELECT bulk_increment_stats($1, $2, $3, $4)',
          stats.projectId,
          emailId,
          stats.opens,
          stats.clicks
        );
      } catch (e) {
        console.error(`Worker: Error updating stats for ${emailId}:`, e);
      }
    }
    console.log(`[${new Date().toISOString()}] Worker: Batch processed successfully.`);
  } catch (err) {
    console.error('Worker: Fatal error in processBatch:', err);
  }
}

let isProcessing = false;

const run = async () => {
  if (isProcessing) return;
  isProcessing = true;
  await processBatch();
  isProcessing = false;
};

run();
setInterval(run, 10000);
