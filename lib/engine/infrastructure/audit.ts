import { randomBytes } from "crypto";

export interface AuditEvent {
  id: string;
  action: string;
  actor_id: string;
  organisation_id: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  request_id?: string;
  correlation_id?: string;
  created_at: string;
}

export class AuditLog {
  private readonly events: AuditEvent[] = [];

  record(input: Omit<AuditEvent, "id" | "created_at">): AuditEvent {
    const event: AuditEvent = {
      ...input,
      id: `audit_${randomBytes(12).toString("base64url")}`,
      created_at: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }

  listForEntity(input: { organisationId: string; entityType: string; entityId: string }): AuditEvent[] {
    return this.events.filter(
      (event) =>
        event.organisation_id === input.organisationId &&
        event.entity_type === input.entityType &&
        event.entity_id === input.entityId
    );
  }
}
