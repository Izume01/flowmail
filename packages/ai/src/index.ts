import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

export interface DeliverabilityResult {
  score: number;
  recommendations: string[];
  spam_triggers: string[];
}

export interface ImprovementResult {
  optimized_subject: string;
  optimized_body: string;
  explanation: string;
}

export interface FlowGraphResult {
  nodes: any[];
  edges: any[];
}

export interface SentimentResult {
  sentiment: string;
  score: number;
  intent: string;
}

export interface FlowPerformanceSuggestion {
  node_id?: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
}

export interface FlowPerformanceResult {
  suggestions: FlowPerformanceSuggestion[];
}

const aiRequestSchema = z.object({
  apiKey: z.string().min(1, 'Anthropic API Key is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

const performanceRequestSchema = z.object({
  apiKey: z.string().min(1, 'Anthropic API Key is required'),
  flowName: z.string().min(1, 'Flow name is required'),
  stats: z.any(),
});

const sentimentRequestSchema = z.object({
  apiKey: z.string().min(1, 'Anthropic API Key is required'),
  content: z.string().min(1, 'Content is required'),
});

export const getDeliverabilityScore = async (
  apiKey: string,
  subject: string,
  body: string
): Promise<DeliverabilityResult> => {
  aiRequestSchema.parse({ apiKey, subject, body });
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `Analyze this email for deliverability. 
      Subject: ${subject}
      Body: ${body}
      
      Return ONLY a valid JSON object with the following structure:
      { "score": 0-100, "recommendations": ["list of strings"], "spam_triggers": ["list of strings"] }`,
      },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response content type from Anthropic');
  }

  try {
    return JSON.parse(content.text) as DeliverabilityResult;
  } catch (error) {
    console.error('Failed to parse AI response:', content.text);
    throw new Error('Failed to parse AI deliverability score');
  }
};

export const improveEmailContent = async (
  apiKey: string,
  subject: string,
  body: string
): Promise<ImprovementResult> => {
  aiRequestSchema.parse({ apiKey, subject, body });
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are an expert Copywriter. Rewrite this email to improve deliverability and engagement.
      Original Subject: ${subject}
      Original Body: ${body}
      
      Return ONLY a valid JSON object with the following structure:
      { "optimized_subject": "string", "optimized_body": "string", "explanation": "string" }`,
      },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response content type from Anthropic');
  }

  try {
    return JSON.parse(content.text) as ImprovementResult;
  } catch (error) {
    console.error('Failed to parse AI response:', content.text);
    throw new Error('Failed to parse AI improvement result');
  }
};

export const generateFlowGraph = async (
  apiKey: string,
  prompt: string
): Promise<FlowGraphResult> => {
  z.object({
    apiKey: z.string().min(1, 'Anthropic API Key is required'),
    prompt: z.string().min(1, 'Prompt is required'),
  }).parse({ apiKey, prompt });
  
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 4000,
    system: `You are a FlowMail Architect. Generate a valid React Flow JSON graph for email automation.
Available nodes: 
1. trigger: The starting point. No data needed.
2. send_email: Sends an email. data: { from: string, subject: string, html: string, text: string }
3. wait: Pauses the flow. data: { duration: number } (in seconds)
4. condition: Branches the flow. data: { field: string, operator: 'equals' | 'exists' | 'contains', value: string }. Edges from condition nodes MUST have sourceHandle set to 'true' or 'false'.

Each node MUST have: id (string), type (string), data (object), position (object with x and y).
Each edge MUST have: id (string), source (string), target (string), and sourceHandle (string, for condition nodes).

Output ONLY a valid JSON object with { "nodes": [], "edges": [] }.`,
    messages: [
      {
        role: 'user',
        content: `Generate a flow for: ${prompt}`,
      },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response content type from Anthropic');
  }

  try {
    return JSON.parse(content.text) as FlowGraphResult;
  } catch (error) {
    console.error('Failed to parse AI response:', content.text);
    throw new Error('Failed to parse AI flow graph');
  }
};

export const analyzeSentiment = async (
  apiKey: string,
  content: string
): Promise<SentimentResult> => {
  sentimentRequestSchema.parse({ apiKey, content });
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `Analyze the sentiment of the following content.
      Content: ${content}
      
      Return ONLY a valid JSON object with the following structure:
      { "sentiment": "string", "score": number (0-1), "intent": "string" }`,
      },
    ],
  });

  const messageContent = response.content[0];
  if (!messageContent || messageContent.type !== 'text') {
    throw new Error('Unexpected response content type from Anthropic');
  }

  try {
    return JSON.parse(messageContent.text) as SentimentResult;
  } catch (error) {
    console.error('Failed to parse AI response:', messageContent.text);
    throw new Error('Failed to parse AI sentiment analysis');
  }
};

export const analyzeFlowPerformance = async (
  apiKey: string,
  flowName: string,
  stats: any
): Promise<FlowPerformanceResult> => {
  performanceRequestSchema.parse({ apiKey, flowName, stats });
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `Analyze this automated email flow performance data.
      Flow: ${flowName}
      Stats: ${JSON.stringify(stats)}
      
      Your goal is to identify points of failure and opportunities for optimization. 
      Focus on:
      - Where users are dropping off (conversion gaps between nodes).
      - Underperforming subject lines (low open rates).
      - Ineffective delays (e.g., too short/long for the specific context).
      - Structural improvements (e.g., adding condition branches for unengaged users).
      
      Provide actionable suggestions. Each suggestion should link to a specific node if possible.
      
      Return ONLY a valid JSON object with the following structure:
      { 
        "suggestions": [
          { "node_id": "optional_string", "content": "detailed suggestion", "priority": "high" | "medium" | "low" }
        ] 
      }`,
      },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response content type from Anthropic');
  }

  try {
    // Try to find JSON in the response if there's any preamble
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content.text;
    return JSON.parse(jsonString) as FlowPerformanceResult;
  } catch (error) {
    console.error('Failed to parse AI response:', content.text);
    throw new Error('Failed to parse AI flow performance analysis');
  }
};
