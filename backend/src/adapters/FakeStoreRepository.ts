import { z } from 'zod';
import { UpstreamError } from '../domain/errors.js';
import { type Category, type Product, toCategorySlug } from '../domain/product.js';
import type { Page, ProductQuery } from '../domain/productQuery.js';
import type { ProductRepository } from '../ports/ProductRepository.js';
import { applyProductQuery } from './inMemoryQuery.js';

/** Shape of a Fake Store product. Validated so a changed or broken response fails loudly here, not in the UI. */
const fakeStoreProductsSchema = z.array(
  z.object({
    id: z.number().int(),
    title: z.string(),
    price: z.number(),
    description: z.string(),
    category: z.string(),
    image: z.string(),
    rating: z.object({ rate: z.number(), count: z.number() }),
  }),
);

/** Validates raw Fake Store data (API response or the committed snapshot) and maps it to our model. */
export function parseFakeStoreProducts(raw: unknown): Product[] {
  return fakeStoreProductsSchema.parse(raw).map((p) => ({
    id: String(p.id),
    title: p.title,
    description: p.description,
    price: p.price,
    category: p.category,
    image: p.image,
    rating: { rate: p.rating.rate, count: p.rating.count },
  }));
}

export interface FakeStoreRepositoryOptions {
  baseUrl: string;
  cacheTtlMs: number;
  /** Served when Fake Store is unreachable and nothing is cached yet. */
  fallbackProducts?: Product[];
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  now?: () => number;
}

/** After a failed fetch, wait this long before trying Fake Store again. */
const RETRY_AFTER_FAILURE_MS = 30_000;

/**
 * Product data from the Fake Store API.
 * Fake Store has ~20 products and no server-side filtering, so the whole list is
 * fetched once, cached in memory and queried in memory. On failure it serves stale
 * cache, then the snapshot.
 */
export class FakeStoreRepository implements ProductRepository {
  private cache?: { products: Product[]; expiresAt: number };
  private inFlight?: Promise<Product[]>;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly timeoutMs: number;

  constructor(private readonly options: FakeStoreRepositoryOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? 5_000;
  }

  async find(query: ProductQuery): Promise<Page<Product>> {
    return applyProductQuery(await this.loadAll(), query);
  }

  async getById(id: string): Promise<Product | undefined> {
    return (await this.loadAll()).find((product) => product.id === id);
  }

  async getByIds(ids: string[]): Promise<Product[]> {
    const wanted = new Set(ids);
    return (await this.loadAll()).filter((product) => wanted.has(product.id));
  }

  async getCategories(): Promise<Category[]> {
    const names = [...new Set((await this.loadAll()).map((product) => product.category))];
    return names.map((name) => ({ slug: toCategorySlug(name), name }));
  }

  private async loadAll(): Promise<Product[]> {
    if (this.cache && this.cache.expiresAt > this.now()) return this.cache.products;
    // Concurrent requests share one upstream call.
    this.inFlight ??= this.refresh().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async refresh(): Promise<Product[]> {
    try {
      const products = await this.fetchProducts();
      this.cache = { products, expiresAt: this.now() + this.options.cacheTtlMs };
      return products;
    } catch (error) {
      const fallback = this.cache?.products ?? this.options.fallbackProducts;
      const source = this.cache ? 'stale cache' : 'snapshot';
      console.warn(`Fake Store request failed (${describe(error)}); serving ${fallback ? source : 'nothing'}.`);
      if (!fallback) throw new UpstreamError('Product data is currently unavailable');
      const retryIn = Math.min(this.options.cacheTtlMs, RETRY_AFTER_FAILURE_MS);
      this.cache = { products: fallback, expiresAt: this.now() + retryIn };
      return fallback;
    }
  }

  private async fetchProducts(): Promise<Product[]> {
    const response = await this.fetchFn(`${this.options.baseUrl}/products`, {
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseFakeStoreProducts(await response.json());
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
