import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { render } from "@react-email/render";
import * as React from "react";
import { z } from "zod";

/**
 * Initialize SES Client
 */
export const createEmailClient = (region: string, accessKeyId: string, secretAccessKey: string) => {
  z.object({
    region: z.string().min(1),
    accessKeyId: z.string().min(1),
    secretAccessKey: z.string().min(1),
  }).parse({ region, accessKeyId, secretAccessKey });

  return new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
};

/**
 * Render a React Email template to HTML
 */
export const renderTemplate = async (component: React.ReactElement): Promise<string> => {
  if (!component) {
    throw new Error("React component is required for rendering");
  }
  return render(component);
};

/**
 * Send email using SES
 */
export const sendEmail = async (
  client: SESClient,
  from: string,
  to: string,
  subject: string,
  html?: string,
  text?: string,
  configurationSetName?: string
) => {
  z.object({
    from: z.string().email(),
    to: z.string().email(),
    subject: z.string().min(1),
    html: z.string().optional(),
    text: z.string().optional(),
    configurationSetName: z.string().optional(),
  }).parse({ from, to, subject, html, text, configurationSetName });

  if (!client) {
    throw new Error("SES Client is required");
  }

  const command = new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Message: {
      Body: {
        ...(html && { Html: { Data: html, Charset: "UTF-8" } }),
        ...(text && { Text: { Data: text, Charset: "UTF-8" } }),
      },
      Subject: { Data: subject, Charset: "UTF-8" },
    },
    Source: from,
    ConfigurationSetName: configurationSetName,
  });
  return client.send(command);
};

/**
 * Send templated email
 */
export const sendTemplatedEmail = async (
  client: SESClient,
  from: string,
  to: string,
  subject: string,
  component: React.ReactElement,
  configurationSetName?: string
) => {
  const html = await renderTemplate(component);
  return sendEmail(client, from, to, subject, html, undefined, configurationSetName);
};

export * from "./templates/BaseTemplate";
