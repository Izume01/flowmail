import { PrismaClient } from '@prisma/client';

export class TenantDB {
  constructor(private prisma: PrismaClient, private projectId: string) {}

  async getEmail(emailId: string) {
    return this.prisma.email.findFirst({
      where: {
        id: emailId,
        projectId: this.projectId,
      },
    });
  }

  async getEmails(limit: number = 10) {
    return this.prisma.email.findMany({
      where: {
        projectId: this.projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async getRecipientStats(email: string) {
    return this.prisma.email.findMany({
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
  }

  async isEmailSuppressed(email: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<[{ exists: boolean }]>`
      SELECT is_email_suppressed(${this.projectId}::uuid, ${email}) as exists
    `;
    return result[0]?.exists || false;
  }

  async getEmailVariants() {
    return this.prisma.emailVariant.findMany({
      where: {
        projectId: this.projectId,
      },
    });
  }

  async incrementVariantSends(variantId: string) {
    return this.prisma.$executeRaw`
      SELECT increment_variant_sends(${this.projectId}::uuid, ${variantId}::uuid)
    `;
  }

  async insertEmail(data: any) {
    return this.prisma.email.create({
      data: {
        ...data,
        projectId: this.projectId,
      },
    });
  }

  async updateEmailStatus(emailId: string, status: string) {
    return this.prisma.email.update({
      where: {
        id: emailId,
        projectId: this.projectId,
      },
      data: {
        status,
      },
    });
  }

  async getFlow(flowId: string) {
    return this.prisma.flow.findFirst({
      where: {
        id: flowId,
        projectId: this.projectId,
      },
    });
  }

  async getActiveFlows() {
    return this.prisma.flow.findMany({
      where: {
        projectId: this.projectId,
        isActive: true,
      },
    });
  }

  async getFlowsByTrigger(triggerType: string) {
    return this.prisma.flow.findMany({
      where: {
        projectId: this.projectId,
        triggerType: triggerType,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
  }

  async insertIdempotencyKey(key: string) {
    return this.prisma.idempotencyKey.create({
      data: {
        key,
      },
    });
  }

  async getEmailOpenHours(email: string) {
    return this.prisma.email.findMany({
      where: {
        toEmail: email,
        projectId: this.projectId,
      },
      select: {
        localOpenHour: true,
      },
    });
  }

  async incrementOpens(emailId: string, userTimezone: string = 'UTC') {
    return this.prisma.$executeRaw`
      SELECT increment_opens(${this.projectId}::uuid, ${emailId}::uuid, ${userTimezone})
    `;
  }

  async incrementClicks(emailId: string) {
    return this.prisma.$executeRaw`
      SELECT increment_clicks(${this.projectId}::uuid, ${emailId}::uuid)
    `;
  }

  async getProject() {
    return this.prisma.project.findUnique({
      where: {
        id: this.projectId,
      },
    });
  }

  async getWebhookConfigs() {
    return this.prisma.webhookConfig.findMany({
      where: {
        projectId: this.projectId,
      },
    });
  }

  async insertWebhookDelivery(configId: string, eventType: string, payload: any) {
    return this.prisma.webhookDelivery.create({
      data: {
        webhookConfigId: configId,
        eventType,
        payload,
      },
    });
  }

  async getDomains() {
    return this.prisma.domain.findMany({
      where: {
        projectId: this.projectId,
      },
    });
  }

  async upsertSuppression(email: string, reason: string) {
    return this.prisma.suppression.upsert({
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
  }

  async upsertContact(email: string, firstName?: string, lastName?: string, attributes?: any) {
    return this.prisma.contact.upsert({
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
  }

  async insertUserEvent(contactId: string, eventName: string, properties?: any) {
    return this.prisma.userEvent.create({
      data: {
        projectId: this.projectId,
        contactId,
        eventName,
        properties: properties || {},
      },
    });
  }

  async createSegment(name: string, rules: any) {
    return this.prisma.segment.create({
      data: {
        projectId: this.projectId,
        name,
        rules,
      },
    });
  }

  async getSegment(segmentId: string) {
    return this.prisma.segment.findFirst({
      where: {
        id: segmentId,
        projectId: this.projectId,
      },
    });
  }

  async getFlowSuggestions(flowId: string) {
    return this.prisma.flowSuggestion.findMany({
      where: {
        flowId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async executeRawQuery(sql: string) {
    return this.prisma.$queryRawUnsafe(sql);
  }
}
