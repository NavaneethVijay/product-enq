export interface EmailMessage {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Port for sending email. Today: SMTP to Mailpit. Later: SES or another provider.
 * Implementations throw `UpstreamError` when the message cannot be sent.
 */
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}
