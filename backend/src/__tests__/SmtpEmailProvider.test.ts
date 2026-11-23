import { describe, expect, it } from 'vitest';
import { smtpTransportOptions } from '../adapters/SmtpEmailProvider.js';

const base = { host: 'smtp.test', port: 587, from: 'catalogue@example.com' };

describe('smtpTransportOptions', () => {
  it('sends no credentials to a relay that needs none (Mailpit)', () => {
    const options = smtpTransportOptions({ ...base, port: 1025 });
    expect(options).toMatchObject({ host: 'smtp.test', port: 1025, secure: false });
    expect(options.auth).toBeUndefined();
    expect(options.requireTLS).toBeUndefined();
  });

  it('authenticates and requires TLS when credentials are configured (e.g. SES on 587)', () => {
    const options = smtpTransportOptions({ ...base, auth: { user: 'user', pass: 'secret' } });
    expect(options).toMatchObject({ secure: false, requireTLS: true, auth: { user: 'user', pass: 'secret' } });
  });

  it('uses implicit TLS on port 465', () => {
    expect(smtpTransportOptions({ ...base, port: 465 }).secure).toBe(true);
  });
});
