import type { Category, Product } from '../domain/product.js';
import type { Page, ProductQuery } from '../domain/productQuery.js';

/**
 * Port for the product data source. Today: Fake Store. Later: a database or ERP.
 * Services depend on this interface only, never on a concrete adapter.
 *
 * Listing goes through `find`, so filtering, sorting and pagination happen in the data
 * source (e.g. one SQL query), never by loading the whole catalogue into the service.
 */
export interface ProductRepository {
  find(query: ProductQuery): Promise<Page<Product>>;
  /** Resolves to undefined when the product does not exist. */
  getById(id: string): Promise<Product | undefined>;
  /** Returns the products that exist, in any order; unknown ids are left out. */
  getByIds(ids: string[]): Promise<Product[]>;
  getCategories(): Promise<Category[]>;
}
