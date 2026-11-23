/**
 * Typed client for our backend API. The only module that knows API paths.
 * The browser never talks to Fake Store; it only calls /api on this origin.
 */

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image: string;
  rating: { rate: number; count: number };
}

export interface Category {
  slug: string;
  name: string;
}

/** One page of a listing. The API supports page/pageSize/sort/minPrice/maxPrice/minRating. */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CategoryProducts {
  category: Category;
  topRated: Product[];
  additional: Page<Product>;
}

export interface EnquiryRequest {
  productId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  website?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Please check your connection and try again.');
  }

  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = (body as { error?: { code?: string; message?: string } } | undefined)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? `Request failed with status ${response.status}`,
    );
  }
  return body as T;
}

export const api = {
  getFeaturedProducts: (signal?: AbortSignal) => request<Product[]>('/products/featured', { signal }),
  searchProducts: (query: string, signal?: AbortSignal) =>
    request<Page<Product>>(`/products?q=${encodeURIComponent(query)}`, { signal }),
  getProduct: (id: string, signal?: AbortSignal) =>
    request<Product>(`/products/${encodeURIComponent(id)}`, { signal }),
  getCategories: (signal?: AbortSignal) => request<Category[]>('/categories', { signal }),
  getCategoryProducts: (slug: string, signal?: AbortSignal) =>
    request<CategoryProducts>(`/categories/${encodeURIComponent(slug)}`, { signal }),
  submitEnquiry: (enquiry: EnquiryRequest) =>
    request<{ status: 'sent' }>('/enquiries', { method: 'POST', body: JSON.stringify(enquiry) }),
};
