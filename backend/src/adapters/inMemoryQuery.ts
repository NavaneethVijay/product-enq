import { type Product, toCategorySlug } from '../domain/product.js';
import type { Page, ProductQuery, ProductSort } from '../domain/productQuery.js';

const comparators: Record<ProductSort, (a: Product, b: Product) => number> = {
  // Ties go to the product with more reviews.
  rating: (a, b) => b.rating.rate - a.rating.rate || b.rating.count - a.rating.count,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
};

/**
 * Applies a ProductQuery to an in-memory list. Used by sources that can't query server-side
 * (Fake Store) and by test fakes. A database adapter would translate the same query to SQL.
 */
export function applyProductQuery(products: Product[], query: ProductQuery): Page<Product> {
  const term = query.search?.trim().toLowerCase();
  const excluded = new Set(query.excludeIds);

  const matches = products.filter(
    (p) =>
      (query.categorySlug === undefined || toCategorySlug(p.category) === query.categorySlug) &&
      (!term || [p.title, p.description, p.category].some((text) => text.toLowerCase().includes(term))) &&
      (query.minPrice === undefined || p.price >= query.minPrice) &&
      (query.maxPrice === undefined || p.price <= query.maxPrice) &&
      (query.minRating === undefined || p.rating.rate >= query.minRating) &&
      !excluded.has(p.id),
  );

  const sorted = query.sort ? [...matches].sort(comparators[query.sort]) : matches;
  const start = (query.page - 1) * query.pageSize;

  return {
    items: sorted.slice(start, start + query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    totalItems: sorted.length,
    totalPages: Math.ceil(sorted.length / query.pageSize),
  };
}
