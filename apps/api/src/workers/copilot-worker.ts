import { getPrisma } from '@flowmail/db';
import { analyzeFlowPerformance } from '@flowmail/ai';

const prisma = getPrisma();

async function processFlows() {
  console.log(`[${new Date().toISOString()}] Copilot Worker: Starting processing...`);
  
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('Copilot Worker: GOOGLE_AI_API_KEY is missing');
    return;
  }

  try {
    // 1. Fetch active flows
    const activeFlows = await prisma.flow.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { executions: true }
        }
      }
    });

    console.log(`[${new Date().toISOString()}] Copilot Worker: Found ${activeFlows.length} active flows.`);

    for (const flow of activeFlows) {
      // Threshold: at least 10 executions
      if (flow._count.executions < 10) {
        console.log(`[${new Date().toISOString()}] Copilot Worker: Skipping flow ${flow.id} (only ${flow._count.executions} executions)`);
        continue;
      }

      console.log(`[${new Date().toISOString()}] Copilot Worker: Analyzing flow ${flow.id} (${flow.name})`);

      // 2. Aggregate stats
      // We'll extract subjects from nodes and aggregate Email records for this project
      const graph = flow.graph as any;
      const nodes = graph?.nodes || [];
      const emailNodes = nodes.filter((n: any) => n.type === 'send_email');

      const stats: any = {
        total_executions: flow._count.executions,
        nodes: []
      };

      for (const node of emailNodes) {
        const subject = node.data?.subject;
        if (!subject) continue;

        const emailStats = await prisma.email.aggregate({
          where: {
            projectId: flow.projectId,
            subject: subject
          },
          _count: { id: true },
          _sum: {
            opens: true,
            clicks: true
          }
        });

        stats.nodes.push({
          node_id: node.id,
          subject: subject,
          sends: emailStats._count.id || 0,
          opens: emailStats._sum.opens || 0,
          clicks: emailStats._sum.clicks || 0,
          open_rate: emailStats._count.id ? (emailStats._sum.opens || 0) / emailStats._count.id : 0,
          click_rate: emailStats._count.id ? (emailStats._sum.clicks || 0) / emailStats._count.id : 0
        });
      }

      // 3. Call AI
      try {
        const result = await analyzeFlowPerformance(apiKey, flow.name, stats);

        // 4. Update suggestions
        // Transaction to clear old and insert new
        await prisma.$transaction([
          prisma.flowSuggestion.deleteMany({
            where: { flowId: flow.id }
          }),
          prisma.flowSuggestion.createMany({
            data: result.suggestions.map(s => ({
              flowId: flow.id,
              nodeId: s.node_id,
              content: s.content,
              priority: s.priority || 'medium'
            }))
          })
        ]);

        console.log(`[${new Date().toISOString()}] Copilot Worker: Successfully updated suggestions for flow ${flow.id}`);
      } catch (aiErr) {
        console.error(`Copilot Worker: AI analysis failed for flow ${flow.id}:`, aiErr);
      }
    }

    console.log(`[${new Date().toISOString()}] Copilot Worker: Finished processing.`);
  } catch (err) {
    console.error('Copilot Worker: Fatal error in processFlows:', err);
  }
}

let isProcessing = false;

const run = async () => {
  if (isProcessing) return;
  isProcessing = true;
  await processFlows();
  isProcessing = false;
};

// Initial run
run();

// Run every hour (3600000 ms)
setInterval(run, 3600000);
