import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Data Access Layer for Tenant-specific operations.
 */
export class TenantDB {
  constructor(private prisma: PrismaClient, private projectId: string) {}

  /**
   * Retrieves a single email by ID.
   */
  async getEmail(emailId: string) {
    try {
      return await this.prisma.email.findFirst({
        where: {
          id: emailId,
          projectId: this.projectId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get email ${emailId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves multiple emails with a limit.
   */
  async getEmails(limit: number = 10) {
    try {
      return await this.prisma.email.findMany({
        where: {
          projectId: this.projectId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    } catch (error) {
      throw new Error(`Failed to get emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets stats for a specific recipient.
   */
  async getRecipientStats(email: string) {
    try {
      return await this.prisma.email.findMany({
        where: {
          projectId: this.projectId,
          toEmail: email,
        },
        select: {
          status: true,
          opens: true,
          localOpenHour: true,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get recipient stats for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if an email is suppressed for this project.
   */
  async isEmailSuppressed(email: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<[{ exists: boolean }]>`
        SELECT is_email_suppressed(${this.projectId}::uuid, ${email}) as exists
      `;
      return result[0]?.exists || false;
    } catch (error) {
      throw new Error(`Failed to check suppression for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves all email variants for the project.
   */
  async getEmailVariants() {
    try {
      return await this.prisma.emailVariant.findMany({
        where: {
          projectId: this.projectId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get email variants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Increments the send count for a specific variant.
   */
  async incrementVariantSends(variantId: string) {
    try {
      return await this.prisma.$executeRaw`
        SELECT increment_variant_sends(${this.projectId}::uuid, ${variantId}::uuid)
      `;
    } catch (error) {
      throw new Error(`Failed to increment variant sends for ${variantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Inserts a new email record.
   */
  async insertEmail(data: Omit<Prisma.EmailUncheckedCreateInput, 'projectId'>) {
    try {
      const createData: Prisma.EmailUncheckedCreateInput = {
        ...data,
        projectId: this.projectId,
      };
      return await this.prisma.email.create({
        data: createData,
      });
    } catch (error) {
      throw new Error(`Failed to insert email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes a contact and all associated data for GDPR compliance.
   */
  async deleteContact(email: string) {
    try {
      // Cascade delete is handled by the database schema (onDelete: Cascade)
      // but we need to find the contact first to ensure it belongs to this project.
      const contact = await this.prisma.contact.findFirst({
        where: {
          email,
          projectId: this.projectId,
        },
      });

      if (!contact) {
        throw new Error(`Contact with email ${email} not found in this project`);
      }

      return await this.prisma.contact.delete({
        where: {
          id: contact.id,
        },
      });
    } catch (error) {
      throw new Error(`Failed to delete contact ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates the status of an email.
   */
  async updateEmailStatus(emailId: string, status: string) {
    try {
      return await this.prisma.email.update({
        where: {
          id: emailId,
          projectId: this.projectId,
        },
        data: {
          status,
        },
      });
    } catch (error) {
      throw new Error(`Failed to update email status for ${emailId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves a flow by ID.
   */
  async getFlow(flowId: string) {
    try {
      return await this.prisma.flow.findFirst({
        where: {
          id: flowId,
          projectId: this.projectId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get flow ${flowId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves all active flows for the project.
   */
  async getActiveFlows() {
    try {
      return await this.prisma.flow.findMany({
        where: {
          projectId: this.projectId,
          isActive: true,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get active flows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves flows triggered by a specific event type.
   */
  async getFlowsByTrigger(triggerType: string) {
    try {
      return await this.prisma.flow.findMany({
        where: {
          projectId: this.projectId,
          triggerType: triggerType,
          isActive: true,
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get flows by trigger ${triggerType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Inserts an idempotency key to prevent duplicate processing.
   */
  async insertIdempotencyKey(key: string) {
    try {
      return await this.prisma.idempotencyKey.create({
        data: {
          key,
        },
      });
    } catch (error) {
      throw new Error(`Failed to insert idempotency key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves open hours history for a recipient.
   */
  async getEmailOpenHours(email: string) {
    try {
      return await this.prisma.email.findMany({
        where: {
          toEmail: email,
          projectId: this.projectId,
        },
        select: {
          localOpenHour: true,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get open hours for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Increments open count and records the hour for an email.
   */
  async incrementOpens(emailId: string, userTimezone: string = 'UTC') {
    try {
      return await this.prisma.$executeRaw`
        SELECT increment_opens(${this.projectId}::uuid, ${emailId}::uuid, ${userTimezone})
      `;
    } catch (error) {
      throw new Error(`Failed to increment opens for ${emailId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Increments click count for an email.
   */
  async incrementClicks(emailId: string) {
    try {
      return await this.prisma.$executeRaw`
        SELECT increment_clicks(${this.projectId}::uuid, ${emailId}::uuid)
      `;
    } catch (error) {
      throw new Error(`Failed to increment clicks for ${emailId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves project details.
   */
  async getProject() {
    try {
      return await this.prisma.project.findUnique({
        where: {
          id: this.projectId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves all webhook configurations for the project.
   */
  async getWebhookConfigs() {
    try {
      return await this.prisma.webhookConfig.findMany({
        where: {
          projectId: this.projectId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get webhook configs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Records a webhook delivery attempt.
   */
  async insertWebhookDelivery(configId: string, eventType: string, payload: Prisma.InputJsonValue) {
    try {
      return await this.prisma.webhookDelivery.create({
        data: {
          webhookConfigId: configId,
          eventType,
          payload,
        },
      });
    } catch (error) {
      throw new Error(`Failed to insert webhook delivery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves all domains configured for the project.
   */
  async getDomains() {
    try {
      return await this.prisma.domain.findMany({
        where: {
          projectId: this.projectId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get domains: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Adds a new domain to the project.
   */
  async addDomain(domainName: string, verificationToken: string) {
    try {
      return await this.prisma.domain.create({
        data: {
          projectId: this.projectId,
          domainName,
          verificationToken,
          isVerified: false,
        },
      });
    } catch (error) {
      throw new Error(`Failed to add domain ${domainName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves a domain by ID.
   */
  async getDomain(domainId: string) {
    try {
      return await this.prisma.domain.findFirst({
        where: {
          id: domainId,
          projectId: this.projectId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get domain ${domainId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates a domain's verification status.
   */
  async updateDomainVerification(domainId: string, isVerified: boolean) {
    try {
      return await this.prisma.domain.update({
        where: {
          id: domainId,
          projectId: this.projectId,
        },
        data: {
          isVerified,
        },
      });
    } catch (error) {
      throw new Error(`Failed to update verification for domain ${domainId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upserts a suppression record for an email.
   */
  async upsertSuppression(email: string, reason: string) {
    try {
      return await this.prisma.suppression.upsert({
        where: {
          projectId_email: {
            projectId: this.projectId,
            email,
          },
        },
        update: {
          reason,
        },
        create: {
          projectId: this.projectId,
          email,
          reason,
        },
      });
    } catch (error) {
      throw new Error(`Failed to upsert suppression for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upserts a contact record.
   */
  async upsertContact(email: string, firstName?: string, lastName?: string, attributes?: Prisma.InputJsonValue) {
    try {
      return await this.prisma.contact.upsert({
        where: {
          projectId_email: {
            projectId: this.projectId,
            email,
          },
        },
        update: {
          firstName,
          lastName,
          attributes: attributes || {},
          updatedAt: new Date(),
        },
        create: {
          projectId: this.projectId,
          email,
          firstName,
          lastName,
          attributes: attributes || {},
        },
      });
    } catch (error) {
      throw new Error(`Failed to upsert contact ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Records a custom user event.
   */
  async insertUserEvent(contactId: string, eventName: string, properties?: Prisma.InputJsonValue) {
    try {
      return await this.prisma.userEvent.create({
        data: {
          projectId: this.projectId,
          contactId,
          eventName,
          properties: properties || {},
        },
      });
    } catch (error) {
      throw new Error(`Failed to insert user event ${eventName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a new audience segment.
   */
  async createSegment(name: string, rules: Prisma.InputJsonValue) {
    try {
      return await this.prisma.segment.create({
        data: {
          projectId: this.projectId,
          name,
          rules,
        },
      });
    } catch (error) {
      throw new Error(`Failed to create segment ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves a segment by ID.
   */
  async getSegment(segmentId: string) {
    try {
      return await this.prisma.segment.findFirst({
        where: {
          id: segmentId,
          projectId: this.projectId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get segment ${segmentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves suggestions for a flow.
   */
  async getFlowSuggestions(flowId: string) {
    try {
      return await this.prisma.flowSuggestion.findMany({
        where: {
          flowId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      throw new Error(`Failed to get flow suggestions for ${flowId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Executes a raw SQL query (Warning: Unsafe).
   */
  async executeRawQuery(sql: string) {
    try {
      return await this.prisma.$queryRawUnsafe(sql);
    } catch (error) {
      throw new Error(`Failed to execute raw query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
