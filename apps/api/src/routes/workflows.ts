import { serve } from "@upstash/workflow/hono";
import { createDbClient, TenantDB } from "@flowmail/db";
import { createEmailClient, sendEmail } from "@flowmail/email";
import { getBestSendTime } from "../services/sto";

interface WorkflowPayload {
  flowId: string;
  projectId: string;
  initialData: Record<string, any>;
}

const calculateSleepUntilHour = (targetHour: number, timezone: string = 'UTC'): number => {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    });
    const currentHour = parseInt(formatter.format(now), 10);

    let hoursToWait = targetHour - currentHour;
    if (hoursToWait < 0) {
      hoursToWait += 24;
    }
    
    if (hoursToWait === 0) return 0;

    return hoursToWait * 3600;
  } catch (err) {
    console.error(`Invalid timezone: ${timezone}, defaulting to 0 wait.`);
    return 0;
  }
};

export const flowWorkflow = serve<WorkflowPayload>(async (context) => {
  const { flowId, projectId, initialData } = context.requestPayload;
  
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const tenantDb = new TenantDB(createDbClient(supabaseUrl, supabaseKey), projectId);

  // 1. Fetch flow from DB
  const flow = await context.run("fetch-flow", async () => {
    const { data, error } = await tenantDb.getFlow(flowId);
    
    if (error) throw new Error(`Failed to fetch flow: ${error.message}`);
    if (!data) throw new Error(`Flow not found: ${flowId}`);
    return data;
  });

  const { nodes, edges } = flow.graph as { nodes: any[], edges: any[] };

  // 2. Find trigger node to start traversal
  const triggerNode = nodes.find((n: any) => n.type === "trigger");
  if (!triggerNode) {
    console.warn("No trigger node found in flow", flowId);
    return;
  }

  // 3. Traversal Logic
  const getNextNodeId = (nodeId: string, sourceHandle?: string) => {
    const edge = edges.find(e => 
      e.source === nodeId && 
      (sourceHandle ? e.sourceHandle === sourceHandle : true)
    );
    return edge ? edge.target : null;
  };

  let currentNodeId: string | null = getNextNodeId(triggerNode.id);

  while (currentNodeId) {
    const node = nodes.find((n: any) => n.id === currentNodeId);
    if (!node) break;

    switch (node.type) {
      case "send_email": {
        const to = initialData.email;
        if (!to) {
          throw new Error(`Recipient email missing for node ${node.id}`);
        }

        // Integrate STO
        const bestHour = await context.run(`sto-${node.id}`, async () => {
          return await getBestSendTime(to, flow.project_id);
        });

        const sleepSeconds = calculateSleepUntilHour(bestHour, initialData.timezone || 'UTC');
        if (sleepSeconds > 0) {
          await context.sleep(`sto-wait-${node.id}`, sleepSeconds);
        }

        await context.run(`send-email-${node.id}`, async () => {
          // Idempotency check: prevent duplicate sends for the same node in the same workflow run or retry
          const executionId = context.headers.get("Upstash-Message-Id") || context.workflowRunId;
          const idempotencyKey = `flow_${flowId}_node_${node.id}_exec_${executionId}`;

          const { error: idempError } = await tenantDb.insertIdempotencyKey(idempotencyKey);

          if (idempError) {
            console.warn(`Duplicate execution detected for key: ${idempotencyKey}. Skipping.`);
            return;
          }

          const { from, subject, html, text } = node.data;

          const sesRegion = process.env.AWS_REGION!;
          const sesAccessKeyId = process.env.AWS_ACCESS_KEY_ID!;
          const sesSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!;
          const emailClient = createEmailClient(sesRegion, sesAccessKeyId, sesSecretAccessKey);

          await sendEmail(emailClient, from, to, subject, html, text);
          
          // Also log the email in the DB
          await tenantDb.insertEmail({
            from_email: from,
            to_email: to,
            subject: subject,
            body_html: html,
            body_text: text,
            status: 'sent'
          });
        });
        currentNodeId = getNextNodeId(node.id);
        break;
      }

      case "wait": {
        const seconds = node.data.duration || 60;
        await context.sleep(`wait-${node.id}`, seconds);
        currentNodeId = getNextNodeId(node.id);
        break;
      }

      case "condition": {
        const result = await context.run(`condition-${node.id}`, async () => {
          const { field, operator, value } = node.data;
          const actualValue = initialData[field];

          if (operator === "equals") return actualValue === value;
          if (operator === "exists") return actualValue !== undefined && actualValue !== null;
          if (operator === "contains") return String(actualValue).includes(String(value));
          return false;
        });

        currentNodeId = getNextNodeId(node.id, result ? "true" : "false");
        break;
      }

      default:
        console.warn(`Unknown node type: ${node.type} for node ${node.id}`);
        currentNodeId = null;
        break;
    }
  }
});
