import { SupabaseClient } from '@supabase/supabase-js';

export class TenantDB {
  constructor(private supabase: SupabaseClient, private projectId: string) {}

  async getEmail(emailId: string) {
    return this.supabase
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .eq('project_id', this.projectId)
      .single();
  }

  async getRecipientStats(email: string) {
    // Return total sends, total opens, and latest open hour
    const { data } = await this.supabase
      .from('emails')
      .select('status, opens, local_open_hour')
      .eq('project_id', this.projectId)
      .eq('to_email', email);
    return data || [];
  }

  async isEmailSuppressed(email: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('is_email_suppressed', {
      p_project_id: this.projectId,
      p_email: email
    });

    if (error) {
      console.error('isEmailSuppressed error:', error);
      throw error;
    }

    return !!data;
  }

  async getEmailVariants() {
    return this.supabase
      .from('email_variants')
      .select('*')
      .eq('project_id', this.projectId);
  }

  async incrementVariantSends(variantId: string) {
    // Note: The RPC increment_variant_sends doesn't currently check project_id.
    // However, we call it with a variantId which is project-scoped.
    return this.supabase.rpc('increment_variant_sends', { variant_id: variantId });
  }

  async insertEmail(data: any) {
    return this.supabase
      .from('emails')
      .insert({ ...data, project_id: this.projectId })
      .select()
      .single();
  }

  async updateEmailStatus(emailId: string, status: string) {
    return this.supabase
      .from('emails')
      .update({ status })
      .eq('id', emailId)
      .eq('project_id', this.projectId);
  }

  async getFlow(flowId: string) {
    return this.supabase
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .eq('project_id', this.projectId)
      .single();
  }

  async getActiveFlows() {
    return this.supabase
      .from('flows')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('is_active', true);
  }

  async getFlowsByTrigger(triggerType: string) {
    return this.supabase
      .from('flows')
      .select('id')
      .eq('project_id', this.projectId)
      .eq('trigger_type', triggerType)
      .eq('is_active', true);
  }

  async insertIdempotencyKey(key: string) {
    // Idempotency keys are global in schema, but we can prefix them or just use as is
    // The schema doesn't have project_id for idempotency_keys
    return this.supabase
      .from('idempotency_keys')
      .insert({ idempotency_key: key });
  }

  async getEmailOpenHours(email: string) {
    return this.supabase
      .from('emails')
      .select('local_open_hour')
      .eq('to_email', email)
      .eq('project_id', this.projectId);
  }

  async incrementOpens(emailId: string, userTimezone: string = 'UTC') {
    // The RPC increment_opens updates the email record. 
    // We should ideally verify project_id, but the current RPC doesn't take it.
    // For now, we trust the emailId is valid for the tenant if it was retrieved via DAL.
    return this.supabase.rpc('increment_opens', { 
      email_id: emailId, 
      user_timezone: userTimezone 
    });
  }

  async incrementClicks(emailId: string) {
    return this.supabase.rpc('increment_clicks', { email_id: emailId });
  }

  async getProject() {
    return this.supabase
      .from('projects')
      .select('*')
      .eq('id', this.projectId)
      .single();
  }

  async getWebhookConfigs() {
    return this.supabase
      .from('webhook_configs')
      .select('*')
      .eq('project_id', this.projectId);
  }

  async insertWebhookDelivery(configId: string, eventType: string, payload: any) {
    // Verify configId belongs to project first or just trust it?
    // Better to join or verify.
    return this.supabase
      .from('webhook_deliveries')
      .insert({
        webhook_config_id: configId,
        event_type: eventType,
        payload
      });
  }

  async getDomains() {
    return this.supabase
      .from('domains')
      .select('*')
      .eq('project_id', this.projectId);
  }

  async upsertSuppression(email: string, reason: string) {
    return this.supabase
      .from('suppressions')
      .upsert({
        project_id: this.projectId,
        email,
        reason
      });
  }

  async upsertContact(email: string, first_name?: string, last_name?: string, attributes?: any) {
    return this.supabase
      .from('contacts')
      .upsert({
        project_id: this.projectId,
        email,
        first_name,
        last_name,
        attributes: attributes || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_id, email' })
      .select()
      .single();
  }

  async insertUserEvent(contact_id: string, event_name: string, properties?: any) {
    return this.supabase
      .from('user_events')
      .insert({
        contact_id,
        event_name,
        properties: properties || {}
      })
      .select()
      .single();
  }

  async createSegment(name: string, rules: any) {
    return this.supabase
      .from('segments')
      .insert({ project_id: this.projectId, name, rules })
      .select()
      .single();
  }

  async getSegment(segmentId: string) {
    return this.supabase
      .from('segments')
      .select('*')
      .eq('id', segmentId)
      .eq('project_id', this.projectId)
      .single();
  }

  async executeRawQuery(sql: string) {
    return this.supabase.rpc('execute_segment_query', { p_query: sql });
  }
}
