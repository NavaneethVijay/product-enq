import { describe, expect, it } from 'vitest';
import { applyProductQuery } from '../adapters/inMemoryQuery.js';
import type { ProductQuery } from '../domain/productQuery.js';
import { fixtureProducts } from './fakes.js';

const run = (query: Partial<ProductQuery>) =>
  applyProductQuery(fixtureProducts, { page: 1, pageSize: 100, ...query });
const ids = (query: Partial<ProductQuery>) => run(query).items.map((p) => p.id);

// Fixture: #1 3.9, #2 4.1, #3 4.7, #4 2.1 (men's clothing), #5 4.6 (jewelery), #6 3.3 (electronics).
describe('applyProductQuery', () => {
  it('returns everything in source order with no filters', () => {
    expect(ids({})).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('filters by category slug, search, rating and excluded ids', () => {
    expect(ids({ categorySlug: 'mens-clothing' })).toEqual(['1', '2', '3', '4']);
    expect(ids({ search: 'SLIM' })).toEqual(['2', '4']);
    expect(ids({ minRating: 4 })).toEqual(['2', '3', '5']);
    expect(ids({ categorySlug: 'mens-clothing', excludeIds: ['1', '3'] })).toEqual(['2', '4']);
  });

  it('filters by price range (inclusive)', () => {
    const products = fixtureProducts.map((p, i) => ({ ...p, price: (i + 1) * 10 })); // 10..60
    const page = applyProductQuery(products, { minPrice: 20, maxPrice: 40, page: 1, pageSize: 100 });
    expect(page.items.map((p) => p.price)).toEqual([20, 30, 40]);
  });

  it('sorts by rating (ties: more reviews first) and by price', () => {
    expect(ids({ sort: 'rating' })).toEqual(['3', '5', '2', '1', '6', '4']);
    const products = fixtureProducts.map((p, i) => ({ ...p, price: [30, 10, 50, 20, 60, 40][i]! }));
    const byPrice = (sort: 'price-asc' | 'price-desc') =>
      applyProductQuery(products, { sort, page: 1, pageSize: 100 }).items.map((p) => p.price);
    expect(byPrice('price-asc')).toEqual([10, 20, 30, 40, 50, 60]);
    expect(byPrice('price-desc')).toEqual([60, 50, 40, 30, 20, 10]);
  });

  it('paginates and reports totals', () => {
    expect(run({ page: 2, pageSize: 4 })).toMatchObject({ page: 2, pageSize: 4, totalItems: 6, totalPages: 2 });
    expect(ids({ page: 2, pageSize: 4 })).toEqual(['5', '6']);
    expect(ids({ page: 3, pageSize: 4 })).toEqual([]);
    expect(run({ search: 'nothing matches' })).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
  });
});
