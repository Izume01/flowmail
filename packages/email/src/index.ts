import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { render } from "@react-email/render";
import * as React from "react";

/**
 * Initialize SES Client
 */
export const createEmailClient = (region: string, accessKeyId: string, secretAccessKey: string) => {
  return new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
};

/**
 * Render a React Email template to HTML
 */
export const renderTemplate = async (component: React.ReactElement): Promise<string> => {
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
  text?: string
) => {
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
  component: React.ReactElement
) => {
  const html = await renderTemplate(component);
  return sendEmail(client, from, to, subject, html);
};

export * from "./templates/BaseTemplate";
