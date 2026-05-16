import Anthropic from '@anthropic-ai/sdk';

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

export const getDeliverabilityScore = async (
  apiKey: string,
  subject: string,
  body: string
): Promise<DeliverabilityResult> => {
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
  if (content.type !== 'text') {
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
  if (content.type !== 'text') {
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
  if (content.type !== 'text') {
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
  if (messageContent.type !== 'text') {
    throw new Error('Unexpected response content type from Anthropic');
  }

  try {
    return JSON.parse(messageContent.text) as SentimentResult;
  } catch (error) {
    console.error('Failed to parse AI response:', messageContent.text);
    throw new Error('Failed to parse AI sentiment analysis');
  }
};
