import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeStoreRepository } from '../adapters/FakeStoreRepository.js';
import { UpstreamError } from '../domain/errors.js';
import { makeProduct } from './fakes.js';

const all = { page: 1, pageSize: 100 };

const apiProduct = (id: number, category = "men's clothing") => ({
  id,
  title: `Item ${id}`,
  price: 12.5,
  description: 'desc',
  category,
  image: 'https://fakestoreapi.com/img/x.png',
  rating: { rate: 4.2, count: 7 },
});

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function setup(responses: Array<Response | Error>, options: { fallback?: boolean; ttlMs?: number } = {}) {
  let time = 0;
  const fetchFn = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    if (next instanceof Error) throw next;
    return next;
  });
  const repo = new FakeStoreRepository({
    baseUrl: 'https://fakestore.test',
    cacheTtlMs: options.ttlMs ?? 60_000,
    fallbackProducts: options.fallback ? [makeProduct({ id: 'snapshot-1' })] : undefined,
    fetchFn: fetchFn as unknown as typeof fetch,
    now: () => time,
  });
  return { repo, fetchFn, advance: (ms: number) => (time += ms) };
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('FakeStoreRepository', () => {
  it('maps Fake Store products to the domain model (string ids)', async () => {
    const { repo, fetchFn } = setup([ok([apiProduct(1)])]);
    const [product] = (await repo.find(all)).items;
    expect(product).toMatchObject({ id: '1', title: 'Item 1', price: 12.5, category: "men's clothing" });
    expect(fetchFn).toHaveBeenCalledWith('https://fakestore.test/products', expect.any(Object));
  });

  it('derives categories with URL-safe slugs', async () => {
    const { repo } = setup([ok([apiProduct(1), apiProduct(2, "women's clothing"), apiProduct(3)])]);
    expect(await repo.getCategories()).toEqual([
      { slug: 'mens-clothing', name: "men's clothing" },
      { slug: 'womens-clothing', name: "women's clothing" },
    ]);
  });

  it('caches results until the TTL expires', async () => {
    const { repo, fetchFn, advance } = setup([ok([apiProduct(1)]), ok([apiProduct(2)])]);
    await repo.find(all);
    await repo.getById('1');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    advance(60_001);
    expect((await repo.find(all)).items[0]?.id).toBe('2');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('serves stale cache when a refresh fails', async () => {
    const { repo, advance } = setup([ok([apiProduct(1)]), new Error('timeout')]);
    await repo.find(all);
    advance(60_001);
    expect((await repo.find(all)).items[0]?.id).toBe('1');
  });

  it('shares one upstream request between concurrent callers', async () => {
    const { repo, fetchFn } = setup([ok([apiProduct(1)])]);
    await Promise.all([repo.find(all), repo.getById('1'), repo.getCategories()]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('waits 30 s after a failure before calling Fake Store again', async () => {
    const { repo, fetchFn, advance } = setup([new Error('ECONNREFUSED'), ok([apiProduct(2)])], { fallback: true });
    await repo.find(all);
    advance(29_000);
    expect((await repo.find(all)).items[0]?.id).toBe('snapshot-1');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    advance(1_001);
    expect((await repo.find(all)).items[0]?.id).toBe('2');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('falls back to the snapshot when Fake Store is down and nothing is cached', async () => {
    const { repo } = setup([new Error('ECONNREFUSED')], { fallback: true });
    expect((await repo.find(all)).items[0]?.id).toBe('snapshot-1');
  });

  it('treats an unexpected response shape as a failure', async () => {
    const { repo } = setup([ok([{ id: 'not-a-number' }])], { fallback: true });
    expect((await repo.find(all)).items[0]?.id).toBe('snapshot-1');
  });

  it('filters, sorts and paginates in memory (Fake Store has no server-side querying)', async () => {
    const products = [apiProduct(1), { ...apiProduct(2), price: 5 }, { ...apiProduct(3), price: 50 }];
    const { repo, fetchFn } = setup([ok(products)]);
    const page = await repo.find({ categorySlug: 'mens-clothing', maxPrice: 20, sort: 'price-asc', page: 1, pageSize: 1 });
    expect(page).toMatchObject({ page: 1, pageSize: 1, totalItems: 2, totalPages: 2 });
    expect(page.items.map((p) => p.id)).toEqual(['2']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('returns only existing products from getByIds', async () => {
    const { repo } = setup([ok([apiProduct(1), apiProduct(2)])]);
    expect((await repo.getByIds(['2', '99'])).map((p) => p.id)).toEqual(['2']);
  });

  it('throws UpstreamError when there is no data at all', async () => {
    const { repo } = setup([new Response('error', { status: 500 })]);
    await expect(repo.find(all)).rejects.toBeInstanceOf(UpstreamError);
  });
});
