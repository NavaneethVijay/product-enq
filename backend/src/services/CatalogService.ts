import { NotFoundError, ValidationError } from '../domain/errors.js';
import type { Category, Product } from '../domain/product.js';
import { DEFAULT_PAGE_SIZE, type ListOptions, type Page } from '../domain/productQuery.js';
import type { ProductRepository } from '../ports/ProductRepository.js';

export interface CategoryProducts {
  category: Category;
  /** The category's best products (after filters); not paginated. */
  topRated: Product[];
  /** Every other product in the category: filtered, sorted and paginated. */
  additional: Page<Product>;
}

export interface CatalogOptions {
  /** The products the owner has chosen to feature, in display order. */
  featuredProductIds: string[];
  /** A product is "top rated" if rated at least `minRating`; at most `count` are shown. */
  topRated: { count: number; minRating: number };
}

/** Catalogue rules (featured, category split, search). Knows nothing about HTTP or Fake Store. */
export class CatalogService {
  constructor(
    private readonly repo: ProductRepository,
    private readonly options: CatalogOptions,
  ) {}

  async getFeatured(): Promise<Product[]> {
    const ids = this.options.featuredProductIds;
    const byId = new Map((await this.repo.getByIds(ids)).map((p) => [p.id, p]));
    const featured: Product[] = [];
    for (const id of ids) {
      const product = byId.get(id);
      if (product) featured.push(product);
      else console.warn(`Featured product id "${id}" not found; skipping it.`);
    }
    return featured;
  }

  getCategories(): Promise<Category[]> {
    return this.repo.getCategories();
  }

  /**
   * Filters (price, rating) narrow the whole category, including top rated.
   * Sort and pagination apply to the `additional` list only; top rated is always by rating.
   */
  async getCategoryProducts(slug: string, list: ListOptions = {}): Promise<CategoryProducts> {
    const category = (await this.repo.getCategories()).find((c) => c.slug === slug);
    if (!category) throw new NotFoundError(`Category "${slug}" not found`);

    const { sort, page = 1, pageSize = DEFAULT_PAGE_SIZE, ...filters } = list;
    const { count, minRating } = this.options.topRated;

    const topRated = await this.repo.find({
      categorySlug: slug,
      ...filters,
      minRating: Math.max(minRating, filters.minRating ?? 0),
      sort: 'rating',
      page: 1,
      pageSize: count,
    });
    const additional = await this.repo.find({
      categorySlug: slug,
      ...filters,
      excludeIds: topRated.items.map((p) => p.id),
      sort: sort ?? 'rating',
      page,
      pageSize,
    });

    return { category, topRated: topRated.items, additional };
  }

  /** Case-insensitive match on title, description and category; filtered, sorted, paginated. */
  async search(query: string, list: ListOptions = {}): Promise<Page<Product>> {
    const term = query.trim();
    if (!term) throw new ValidationError('Search term is required');
    const { sort, page = 1, pageSize = DEFAULT_PAGE_SIZE, ...filters } = list;
    return this.repo.find({ search: term, ...filters, sort, page, pageSize });
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.repo.getById(id);
    if (!product) throw new NotFoundError(`Product "${id}" not found`);
    return product;
  }
}
