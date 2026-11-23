/**
 * How products are listed: filters, sorting and pagination.
 * Every product data source (Fake Store today, a database later) implements this through
 * `ProductRepository.find`, so adding UI controls later needs no backend redesign.
 */

export const PRODUCT_SORTS = ['rating', 'price-asc', 'price-desc'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

export interface ProductFilters {
  minPrice?: number;
  maxPrice?: number;
  /** Minimum rating, 0-5. */
  minRating?: number;
}

export interface ProductQuery extends ProductFilters {
  categorySlug?: string;
  /** Case-insensitive text match on title, description and category. */
  search?: string;
  excludeIds?: string[];
  /** Omitted = the source's natural order. */
  sort?: ProductSort;
  /** 1-based. */
  page: number;
  pageSize: number;
}

/** Listing options a client can send (filters + sort + pagination). */
export interface ListOptions extends ProductFilters {
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
