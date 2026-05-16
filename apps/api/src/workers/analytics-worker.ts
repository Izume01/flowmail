import { Redis } from '@upstash/redis';
import { createDbClient } from '@flowmail/db';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createDbClient(supabaseUrl, supabaseKey);

async function processBatch() {
  console.log(`[${new Date().toISOString()}] Worker: Checking for events...`);
  try {
    // Pull up to 1000 items from the right side of the list
    const events: any[] | null = await redis.rpop('analytics_queue', 1000);
    
    if (!events || events.length === 0) {
      return;
    }

    console.log(`[${new Date().toISOString()}] Worker: Processing ${events.length} events...`);
    const aggregations: Record<string, { opens: number; clicks: number }> = {};

    for (const raw of events) {
      let event;
      try {
        event = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        console.error('Worker: Failed to parse event', raw);
        continue;
      }
      
      if (!event.emailId) continue;

      if (!aggregations[event.emailId]) {
        aggregations[event.emailId] = { opens: 0, clicks: 0 };
      }
      if (event.type === 'open') aggregations[event.emailId].opens++;
      if (event.type === 'click') aggregations[event.emailId].clicks++;
    }

    const emailIds = Object.keys(aggregations);
    console.log(`[${new Date().toISOString()}] Worker: Aggregated into ${emailIds.length} unique emails.`);

    for (const emailId of emailIds) {
      const stats = aggregations[emailId];
      const { error } = await supabase.rpc('bulk_increment_stats', {
        p_email_id: emailId,
        p_opens: stats.opens,
        p_clicks: stats.clicks,
      });

      if (error) {
        console.error(`Worker: Error updating stats for ${emailId}:`, error);
      }
    }
    console.log(`[${new Date().toISOString()}] Worker: Batch processed successfully.`);
  } catch (err) {
    console.error('Worker: Fatal error in processBatch:', err);
  }
}

// Ensure we don't overlap executions
let isProcessing = false;

const run = async () => {
  if (isProcessing) return;
  isProcessing = true;
  await processBatch();
  isProcessing = false;
};

// Initial run
run();

// Run every 10 seconds
setInterval(run, 10000);
