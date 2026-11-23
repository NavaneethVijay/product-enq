import type { Config } from '../config.js';
import { type Category, type Product, toCategorySlug } from '../domain/product.js';
import { UpstreamError } from '../domain/errors.js';
import type { EmailMessage, EmailProvider } from '../ports/EmailProvider.js';
import type { Page, ProductQuery } from '../domain/productQuery.js';
import type { ProductRepository } from '../ports/ProductRepository.js';
import { applyProductQuery } from '../adapters/inMemoryQuery.js';

export function makeProduct(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    title: `Product ${overrides.id}`,
    description: 'A product',
    price: 10,
    category: 'gadgets',
    image: 'https://example.com/image.png',
    rating: { rate: 3, count: 10 },
    ...overrides,
  };
}

/** Small, hand-written catalogue so each test's expectations are easy to read. */
export const fixtureProducts: Product[] = [
  makeProduct({ id: '1', title: 'Blue Backpack', category: "men's clothing", rating: { rate: 3.9, count: 120 } }),
  makeProduct({ id: '2', title: 'Slim Fit T-Shirt', category: "men's clothing", rating: { rate: 4.1, count: 259 } }),
  makeProduct({ id: '3', title: 'Cotton Jacket', category: "men's clothing", rating: { rate: 4.7, count: 500 } }),
  makeProduct({ id: '4', title: 'Casual Slim Fit', category: "men's clothing", rating: { rate: 2.1, count: 430 } }),
  makeProduct({ id: '5', title: 'Gold Bracelet', category: 'jewelery', rating: { rate: 4.6, count: 400 } }),
  makeProduct({
    id: '6',
    title: 'Portable Drive',
    description: 'Fast external SSD storage',
    category: 'electronics',
    rating: { rate: 3.3, count: 203 },
  }),
];

export class InMemoryProductRepository implements ProductRepository {
  constructor(private readonly products: Product[] = fixtureProducts) {}

  async find(query: ProductQuery): Promise<Page<Product>> {
    return applyProductQuery(this.products, query);
  }

  async getByIds(ids: string[]): Promise<Product[]> {
    return this.products.filter((p) => ids.includes(p.id));
  }

  async getById(id: string): Promise<Product | undefined> {
    return this.products.find((p) => p.id === id);
  }

  async getCategories(): Promise<Category[]> {
    const names = [...new Set(this.products.map((p) => p.category))];
    return names.map((name) => ({ slug: toCategorySlug(name), name }));
  }
}

/** Records sent emails; set `fail = true` to simulate a provider outage. */
export class FakeEmailProvider implements EmailProvider {
  sent: EmailMessage[] = [];
  fail = false;

  async send(message: EmailMessage): Promise<void> {
    if (this.fail) throw new UpstreamError('The email could not be sent. Please try again later.');
    this.sent.push(message);
  }
}

export const testConfig: Config = {
  port: 0,
  trustProxy: 0,
  fakeStoreBaseUrl: 'https://fakestore.test',
  cacheTtlSeconds: 300,
  featuredProductIds: ['5', '1', '3'],
  topRated: { count: 3, minRating: 3 },
  smtp: { host: 'localhost', port: 1025, from: 'catalogue@example.com' },
  salesInboxEmail: 'sales@example.com',
};
