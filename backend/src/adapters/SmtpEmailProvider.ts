import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { UpstreamError } from '../domain/errors.js';
import type { EmailMessage, EmailProvider } from '../ports/EmailProvider.js';

export interface SmtpConfig {
  host: string;
  port: number;
  from: string;
  auth?: { user: string; pass: string };
}

/** Transport settings, kept separate so they can be tested without opening a connection. */
export function smtpTransportOptions(config: SmtpConfig): SMTPTransport.Options {
  return {
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    // With credentials (e.g. SES on 587), refuse to send them unless the connection is upgraded to TLS.
    ...(config.auth ? { auth: config.auth, requireTLS: true } : {}),
    // Fail fast so the customer sees "try again" instead of waiting minutes (defaults are 2 min+).
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  };
}

/** Sends email over SMTP: Mailpit locally, SES SMTP (or any authenticated relay) in production via config. */
export class SmtpEmailProvider implements EmailProvider {
  constructor(
    private readonly transporter: Pick<Transporter, 'sendMail'>,
    private readonly from: string,
  ) {}

  static fromConfig(config: SmtpConfig): SmtpEmailProvider {
    const transporter = nodemailer.createTransport(smtpTransportOptions(config));
    return new SmtpEmailProvider(transporter, config.from);
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, ...message });
    } catch (error) {
      console.error(`SMTP send failed: ${describe(error)}`);
      throw new UpstreamError('The email could not be sent. Please try again later.');
    }
  }
}

/** Nodemailer connection errors can have an empty message; include name and code. */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = (error as NodeJS.ErrnoException).code;
  return [error.name, code, error.message].filter(Boolean).join(' ');
}
