import { z } from 'zod';

export const sendEmailSchema = z.object({
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string().optional(),
  html: z.string().optional(),
  text: z.string().optional(),
});

export type SendEmailRequest = z.infer<typeof sendEmailSchema>;

export const identifySchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
});

export type IdentifyRequest = z.infer<typeof identifySchema>;

export const trackSchema = z.object({
  email: z.string().email(),
  event_name: z.string(),
  properties: z.record(z.unknown()).optional(),
});

export type TrackRequest = z.infer<typeof trackSchema>;
