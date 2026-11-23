import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config.js';

const validEnv = {
  FEATURED_PRODUCT_IDS: '1, 5,9',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  SMTP_FROM: 'catalogue@example.com',
  SALES_INBOX_EMAIL: 'sales@example.com',
};

describe('loadConfig', () => {
  it('parses valid env and applies defaults', () => {
    const config = loadConfig(validEnv);
    expect(config.port).toBe(3000);
    expect(config.cacheTtlSeconds).toBe(300);
    expect(config.featuredProductIds).toEqual(['1', '5', '9']);
    expect(config.topRated).toEqual({ count: 3, minRating: 3 });
    expect(config.smtp).toEqual({ host: 'localhost', port: 1025, from: 'catalogue@example.com' });
  });

  it('names the invalid variable in the error', () => {
    expect(() => loadConfig({ ...validEnv, SALES_INBOX_EMAIL: 'not-an-email' })).toThrow(/SALES_INBOX_EMAIL/);
  });

  it('rejects a minimum rating outside 0-5', () => {
    expect(() => loadConfig({ ...validEnv, TOP_RATED_MIN_RATING: '6' })).toThrow(/TOP_RATED_MIN_RATING/);
  });

  it('adds SMTP credentials only when both are set (empty values count as unset)', () => {
    expect(loadConfig({ ...validEnv, SMTP_USER: '', SMTP_PASS: '' }).smtp.auth).toBeUndefined();
    expect(loadConfig({ ...validEnv, SMTP_USER: 'user', SMTP_PASS: 'secret' }).smtp.auth).toEqual({
      user: 'user',
      pass: 'secret',
    });
  });

  it('rejects SMTP_USER without SMTP_PASS', () => {
    expect(() => loadConfig({ ...validEnv, SMTP_USER: 'user' })).toThrow(/SMTP_USER: set both/);
  });

  it('requires at least one featured product id', () => {
    expect(() => loadConfig({ ...validEnv, FEATURED_PRODUCT_IDS: ' , ' })).toThrow(/FEATURED_PRODUCT_IDS/);
  });
});
