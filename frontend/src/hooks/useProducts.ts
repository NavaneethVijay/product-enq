import { api } from '../api/client';
import { useApi } from './useApi';

export const useFeaturedProducts = () => useApi((signal) => api.getFeaturedProducts(signal), []);

export const useCategories = () => useApi((signal) => api.getCategories(signal), []);

export const useCategoryProducts = (slug: string) =>
  useApi((signal) => api.getCategoryProducts(slug, signal), [slug]);

export const useProduct = (id: string) => useApi((signal) => api.getProduct(id, signal), [id]);

export const useSearchResults = (query: string) =>
  useApi((signal) => api.searchProducts(query, signal), [query]);
