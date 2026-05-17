import { GoogleGenAI } from "@google/genai";
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

export interface FlowGraphNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface FlowGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface FlowGraphResult {
  nodes: FlowGraphNode[];
  edges: FlowGraphEdge[];
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
  apiKey: z.string().min(1, 'Google AI API Key is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

const performanceRequestSchema = z.object({
  apiKey: z.string().min(1, 'Google AI API Key is required'),
  flowName: z.string().min(1, 'Flow name is required'),
  stats: z.record(z.unknown()),
});

const FlowGraphNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.unknown()),
  position: z.object({ x: z.number(), y: z.number() }),
});

const FlowGraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
});

const sentimentRequestSchema = z.object({
  apiKey: z.string().min(1, 'Google AI API Key is required'),
  content: z.string().min(1, 'Content is required'),
});

function tryExtractJson<T>(text: string, errorMessage: string = 'Failed to parse AI response'): T {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    console.error('Failed to parse AI response:', text);
    throw new Error(errorMessage);
  }
}

const MODEL_NAME = "gemini-flash-latest";

const getClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

export const getDeliverabilityScore = async (
  apiKey: string,
  subject: string,
  body: string
): Promise<DeliverabilityResult> => {
  aiRequestSchema.parse({ apiKey, subject, body });
  const client = getClient(apiKey);

  const result = await client.models.generateContent({
    model: MODEL_NAME,
    contents: `Analyze this email for deliverability. 
      Subject: ${subject}
      Body: ${body}
      
      Return ONLY a valid JSON object with the following structure:
      { "score": 0-100, "recommendations": ["list of strings"], "spam_triggers": ["list of strings"] }`
  });

  if (!result.text) {
    throw new Error('Unexpected empty response from Google AI');
  }

  return tryExtractJson<DeliverabilityResult>(result.text, 'Failed to parse AI deliverability score');
};

export const improveEmailContent = async (
  apiKey: string,
  subject: string,
  body: string
): Promise<ImprovementResult> => {
  aiRequestSchema.parse({ apiKey, subject, body });
  const client = getClient(apiKey);

  const result = await client.models.generateContent({
    model: MODEL_NAME,
    contents: `You are an expert Copywriter. Rewrite this email to improve deliverability and engagement.
      Original Subject: ${subject}
      Original Body: ${body}
      
      Return ONLY a valid JSON object with the following structure:
      { "optimized_subject": "string", "optimized_body": "string", "explanation": "string" }`
  });

  if (!result.text) {
    throw new Error('Unexpected empty response from Google AI');
  }

  return tryExtractJson<ImprovementResult>(result.text, 'Failed to parse AI improvement result');
};

export const generateFlowGraph = async (
  apiKey: string,
  prompt: string
): Promise<FlowGraphResult> => {
  z.object({
    apiKey: z.string().min(1, 'Google AI API Key is required'),
    prompt: z.string().min(1, 'Prompt is required'),
  }).parse({ apiKey, prompt });
  
  const client = getClient(apiKey);

  const result = await client.models.generateContent({
    model: MODEL_NAME,
    contents: `You are a FlowMail Architect. Generate a valid React Flow JSON graph for email automation.
Available nodes: 
1. trigger: The starting point. No data needed.
2. send_email: Sends an email. data: { from: string, subject: string, html: string, text: string }
3. wait: Pauses the flow. data: { duration: number } (in seconds)
4. condition: Branches the flow. data: { field: string, operator: 'equals' | 'exists' | 'contains', value: string }. Edges from condition nodes MUST have sourceHandle set to 'true' or 'false'.

Each node MUST have: id (string), type (string), data (object), position (object with x and y).
Each edge MUST have: id (string), source (string), target (string), and sourceHandle (string, for condition nodes).

Output ONLY a valid JSON object with { "nodes": [], "edges": [] }. Prompt: ${prompt}`
  });

  if (!result.text) {
    throw new Error('Unexpected empty response from Google AI');
  }

  const json = tryExtractJson<FlowGraphResult>(result.text, 'Failed to parse AI flow graph');
  
  // Validate with Zod
  z.object({
    nodes: z.array(FlowGraphNodeSchema),
    edges: z.array(FlowGraphEdgeSchema),
  }).parse(json);

  return json;
};

export const analyzeSentiment = async (
  apiKey: string,
  content: string
): Promise<SentimentResult> => {
  sentimentRequestSchema.parse({ apiKey, content });
  const client = getClient(apiKey);

  const result = await client.models.generateContent({
    model: MODEL_NAME,
    contents: `Analyze the sentiment of the following content.
      Content: ${content}
      
      Return ONLY a valid JSON object with the following structure:
      { "sentiment": "string", "score": number (0-1), "intent": "string" }`
  });

  if (!result.text) {
    throw new Error('Unexpected empty response from Google AI');
  }

  return tryExtractJson<SentimentResult>(result.text, 'Failed to parse AI sentiment analysis');
};

export const analyzeFlowPerformance = async (
  apiKey: string,
  flowName: string,
  stats: Record<string, unknown>
): Promise<FlowPerformanceResult> => {
  performanceRequestSchema.parse({ apiKey, flowName, stats });
  const client = getClient(apiKey);

  const result = await client.models.generateContent({
    model: MODEL_NAME,
    contents: `Analyze this automated email flow performance data.
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
      }`
  });

  if (!result.text) {
    throw new Error('Unexpected empty response from Google AI');
  }

  return tryExtractJson<FlowPerformanceResult>(result.text, 'Failed to parse AI flow performance analysis');
};
