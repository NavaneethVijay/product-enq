/** Our product model. Adapters map external sources (Fake Store, a DB, an ERP) into this shape. */
export interface Product {
  /** String so future SKUs or UUIDs fit without a model change. */
  id: string;
  title: string;
  description: string;
  price: number;
  /** Category display name, e.g. "men's clothing". */
  category: string;
  image: string;
  rating: { rate: number; count: number };
}

export interface Category {
  /** URL-safe identifier, e.g. "mens-clothing". */
  slug: string;
  name: string;
}

/** "men's clothing" -> "mens-clothing" */
export function toCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
