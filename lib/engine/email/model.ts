export type EmailProvider = "manual" | "gmail" | "outlook" | "imap" | "api";
export type EmailDirection = "inbound" | "outbound";

export interface ProviderEmailMessage {
  provider: EmailProvider;
  provider_thread_id: string;
  provider_message_id: string;
  direction: EmailDirection;
  subject: string;
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  sent_at: string;
  body_text: string;
  headers?: Record<string, string>;
}

export interface EmailIngestionAdapter {
  provider: EmailProvider;
  ingest(input: unknown): Promise<ProviderEmailMessage>;
}

export interface FutureGmailAdapter extends EmailIngestionAdapter {
  provider: "gmail";
  buildAuthorizationUrl?(state: string): string;
  exchangeAuthorizationCode?(code: string): Promise<never>;
}

export interface NegotiationContext {
  summary: string;
  mentioned_terms: string[];
  dates: string[];
  money: string[];
  risk_flags: string[];
}

export interface DraftReply {
  subject: string;
  body: string;
  context: NegotiationContext;
}
