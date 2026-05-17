import { SendEmailRequest, IdentifyRequest, TrackRequest, sendEmailSchema, identifySchema, trackSchema, verifyWebhookSignature } from '@flowmail/shared';

export * from '@flowmail/shared';

export interface FlowMailConfig {
  apiKey: string;
  baseUrl?: string;
}

export class FlowMail {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: string | FlowMailConfig) {
    if (typeof config === 'string') {
      this.apiKey = config;
      this.baseUrl = 'https://api.flowmail.com'; // Default production URL
    } else {
      if (!config.apiKey) {
        throw new Error('FlowMail SDK Error: apiKey is required');
      }
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl || 'https://api.flowmail.com';
    }
  }

  private async request(path: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`FlowMail SDK Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Send an email using FlowMail.
   */
  async sendEmail(payload: SendEmailRequest): Promise<{ id: string }> {
    sendEmailSchema.parse(payload);
    return this.request('/emails', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Trigger a flow event.
   */
  async triggerEvent(event: string, data: any): Promise<{ success: boolean }> {
    if (!event) throw new Error('Event name is required');
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify({ event, data }),
    });
  }

  /**
   * Identify a user with custom attributes.
   */
  async identify(payload: IdentifyRequest): Promise<any> {
    identifySchema.parse(payload);
    return this.request('/audience/identify', { method: 'POST', body: JSON.stringify(payload) });
  }

  /**
   * Track a custom user event.
   */
  async track(payload: TrackRequest): Promise<Record<string, unknown>> {
    trackSchema.parse(payload);
    return this.request('/audience/track', { method: 'POST', body: JSON.stringify(payload) });
  }

  /**
   * Verify an incoming webhook signature.
   */
  verifyWebhook(payload: string, signatureHeader: string, secret: string, tolerance: number = 300): boolean {
    if (!payload || !signatureHeader || !secret) {
      throw new Error('Missing required arguments for webhook verification');
    }
    return verifyWebhookSignature(payload, signatureHeader, secret, tolerance);
  }
}
