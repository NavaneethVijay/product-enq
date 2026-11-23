import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { ENQUIRY_RATE_LIMIT } from '../routes/enquiries.js';
import { FakeEmailProvider, InMemoryProductRepository, testConfig } from './fakes.js';

let email: FakeEmailProvider;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  email = new FakeEmailProvider();
  app = createApp({ config: testConfig, productRepo: new InMemoryProductRepository(), emailProvider: email });
});

describe('GET /api/products/featured', () => {
  it('returns the configured featured products', async () => {
    const res = await request(app).get('/api/products/featured');
    expect(res.status).toBe(200);
    expect(res.body.map((p: { id: string }) => p.id)).toEqual(['5', '1', '3']);
  });
});

describe('GET /api/products?q=', () => {
  it('returns only matching products', async () => {
    const res = await request(app).get('/api/products').query({ q: 'jacket' });
    expect(res.status).toBe(200);
    expect(res.body.items.map((p: { id: string }) => p.id)).toEqual(['3']);
    expect(res.body).toMatchObject({ page: 1, pageSize: 24, totalItems: 1, totalPages: 1 });
  });

  it('accepts sort and pagination options', async () => {
    const res = await request(app).get('/api/products').query({ q: 'slim', sort: 'rating', pageSize: 1, page: 2 });
    expect(res.status).toBe(200);
    expect(res.body.items.map((p: { id: string }) => p.id)).toEqual(['4']);
    expect(res.body).toMatchObject({ page: 2, pageSize: 1, totalItems: 2, totalPages: 2 });
  });

  it('returns 400 when the term is missing or blank', async () => {
    expect((await request(app).get('/api/products')).status).toBe(400);
    const res = await request(app).get('/api/products').query({ q: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/products/:id', () => {
  it('returns the product', async () => {
    const res = await request(app).get('/api/products/3');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Cotton Jacket');
  });

  it('returns 404 for an unknown product and 400 for an invalid id', async () => {
    expect((await request(app).get('/api/products/999')).status).toBe(404);
    expect((await request(app).get('/api/products/bad%20id')).status).toBe(400);
  });
});

describe('GET /api/categories', () => {
  it('lists categories with slugs', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toContainEqual({ slug: 'mens-clothing', name: "men's clothing" });
  });

  it('returns top rated and additional products for a category', async () => {
    const res = await request(app).get('/api/categories/mens-clothing');
    expect(res.status).toBe(200);
    expect(res.body.topRated).toHaveLength(3);
    expect(res.body.additional.items).toHaveLength(1);
    expect(res.body.additional).toMatchObject({ page: 1, totalItems: 1, totalPages: 1 });
  });

  it('accepts filter, sort and pagination options', async () => {
    const res = await request(app)
      .get('/api/categories/mens-clothing')
      .query({ minRating: 4, sort: 'price-asc', page: 1, pageSize: 10 });
    expect(res.status).toBe(200);
    expect(res.body.topRated.map((p: { id: string }) => p.id)).toEqual(['3', '2']);
    expect(res.body.additional.items).toEqual([]);
  });

  it('returns 400 for invalid list options', async () => {
    const bad = [{ sort: 'newest' }, { page: 0 }, { pageSize: 101 }, { minRating: 6 }, { minPrice: 50, maxPrice: 10 }];
    for (const query of bad) {
      const res = await request(app).get('/api/categories/mens-clothing').query(query);
      expect(res.status, JSON.stringify(query)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns 404 for an unknown category', async () => {
    const res = await request(app).get('/api/categories/shoes');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Category "shoes" not found' } });
  });
});

describe('POST /api/enquiries', () => {
  const valid = { productId: '3', name: 'Ann Lee', email: 'ann@example.com', phone: '', message: 'Do you ship to Leeds?' };

  it('emails the sales inbox and returns 202', async () => {
    const res = await request(app).post('/api/enquiries').send(valid);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: 'sent' });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]).toMatchObject({
      to: 'sales@example.com',
      replyTo: 'ann@example.com',
      subject: 'New enquiry: Cotton Jacket',
    });
    expect(email.sent[0]?.text).toContain('Do you ship to Leeds?');
  });

  it('returns 400 and sends nothing for invalid input', async () => {
    const res = await request(app).post('/api/enquiries').send({ ...valid, name: ' ', email: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/name/);
    expect(res.body.error.message).toMatch(/email/);
    expect(email.sent).toHaveLength(0);
  });

  it('rejects line breaks in single-line fields (header injection)', async () => {
    const res = await request(app).post('/api/enquiries').send({ ...valid, name: 'Ann\r\nBcc: x@evil.test' });
    expect(res.status).toBe(400);
    expect(email.sent).toHaveLength(0);
  });

  it('returns 404 for an unknown product', async () => {
    const res = await request(app).post('/api/enquiries').send({ ...valid, productId: '999' });
    expect(res.status).toBe(404);
    expect(email.sent).toHaveLength(0);
  });

  it('returns 502 when the email provider fails', async () => {
    email.fail = true;
    const res = await request(app).post('/api/enquiries').send(valid);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
  });

  it('accepts but silently drops submissions that fill the honeypot field', async () => {
    const res = await request(app).post('/api/enquiries').send({ ...valid, website: 'https://spam.example' });
    expect(res.status).toBe(202);
    expect(email.sent).toHaveLength(0);
  });

  it(`rate limits to ${ENQUIRY_RATE_LIMIT.limit} enquiries per client per window`, async () => {
    for (let i = 0; i < ENQUIRY_RATE_LIMIT.limit; i++) {
      expect((await request(app).post('/api/enquiries').send(valid)).status).toBe(202);
    }
    const res = await request(app).post('/api/enquiries').send(valid);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
    expect(email.sent).toHaveLength(ENQUIRY_RATE_LIMIT.limit);
    // Browsing is not rate limited.
    expect((await request(app).get('/api/products/3')).status).toBe(200);
  });

  it('behind a proxy, limits each real client (X-Forwarded-For) separately', async () => {
    const proxied = createApp({
      config: { ...testConfig, trustProxy: 1 },
      productRepo: new InMemoryProductRepository(),
      emailProvider: email,
    });
    const from = (ip: string) => request(proxied).post('/api/enquiries').set('X-Forwarded-For', ip).send(valid);
    for (let i = 0; i < ENQUIRY_RATE_LIMIT.limit; i++) await from('203.0.113.1');
    expect((await from('203.0.113.1')).status).toBe(429);
    expect((await from('203.0.113.2')).status).toBe(202);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .set('Content-Type', 'application/json')
      .send('{"broken"');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('unknown routes', () => {
  it('return a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
