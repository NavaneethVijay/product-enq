import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, ValidationError } from '../domain/errors.js';
import { CatalogService } from '../services/CatalogService.js';
import { InMemoryProductRepository, fixtureProducts } from './fakes.js';

const catalog = (featuredProductIds = ['5', '1', '3'], topRated = { count: 3, minRating: 3 }) =>
  new CatalogService(new InMemoryProductRepository(), { featuredProductIds, topRated });

const ids = (products: { id: string }[]) => products.map((p) => p.id);

afterEach(() => vi.restoreAllMocks());

describe('CatalogService.getFeatured', () => {
  it('returns the chosen products in the configured order', async () => {
    expect(ids(await catalog(['5', '1', '3']).getFeatured())).toEqual(['5', '1', '3']);
  });

  it('skips unknown ids and logs a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(ids(await catalog(['1', '999', '2']).getFeatured())).toEqual(['1', '2']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('999'));
  });
});

describe('CatalogService.getCategoryProducts', () => {
  it('splits a category into the top rated (by rating, max count) and the rest', async () => {
    const result = await catalog().getCategoryProducts('mens-clothing');
    expect(result.category).toEqual({ slug: 'mens-clothing', name: "men's clothing" });
    expect(ids(result.topRated)).toEqual(['3', '2', '1']);
    expect(ids(result.additional.items)).toEqual(['4']);
  });

  it('only counts products at or above the minimum rating as top rated', async () => {
    // men's clothing ratings: #3 4.7, #2 4.1, #1 3.9, #4 2.1
    const result = await catalog(undefined, { count: 3, minRating: 4 }).getCategoryProducts('mens-clothing');
    expect(ids(result.topRated)).toEqual(['3', '2']);
    expect(ids(result.additional.items)).toEqual(['1', '4']);
  });

  it('returns an empty topRated list when nothing meets the minimum', async () => {
    const result = await catalog(undefined, { count: 3, minRating: 5 }).getCategoryProducts('mens-clothing');
    expect(result.topRated).toEqual([]);
    expect(ids(result.additional.items)).toEqual(['3', '2', '1', '4']);
  });

  it('puts everything in topRated when a small category all qualifies', async () => {
    const result = await catalog().getCategoryProducts('jewelery');
    expect(ids(result.topRated)).toEqual(['5']);
    expect(result.additional.items).toEqual([]);
  });

  it('throws NotFoundError for an unknown category', async () => {
    await expect(catalog().getCategoryProducts('shoes')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CatalogService.getCategoryProducts with list options', () => {
  // men's clothing: #3 4.7, #2 4.1, #1 3.9, #4 2.1 (all priced 10 except where overridden)
  const priced = new CatalogService(
    new InMemoryProductRepository(
      fixtureProducts.map((p) => ({ ...p, price: { '1': 15, '2': 40, '3': 90, '4': 5 }[p.id] ?? p.price })),
    ),
    { featuredProductIds: [], topRated: { count: 2, minRating: 3 } },
  );

  it('returns pagination details for the additional list', async () => {
    const result = await priced.getCategoryProducts('mens-clothing', { pageSize: 1 });
    expect(ids(result.topRated)).toEqual(['3', '2']);
    expect(result.additional).toMatchObject({ page: 1, pageSize: 1, totalItems: 2, totalPages: 2 });
    expect(ids(result.additional.items)).toEqual(['1']);
    expect(ids((await priced.getCategoryProducts('mens-clothing', { pageSize: 1, page: 2 })).additional.items)).toEqual(['4']);
  });

  it('applies price filters to both top rated and additional', async () => {
    const result = await priced.getCategoryProducts('mens-clothing', { maxPrice: 50 });
    expect(ids(result.topRated)).toEqual(['2', '1']); // #3 (90) filtered out
    expect(ids(result.additional.items)).toEqual(['4']);
  });

  it('sorts only the additional list; top rated stays by rating', async () => {
    const result = await priced.getCategoryProducts('mens-clothing', { sort: 'price-desc' });
    expect(ids(result.topRated)).toEqual(['3', '2']);
    expect(ids(result.additional.items)).toEqual(['1', '4']);
    const cheapFirst = await priced.getCategoryProducts('mens-clothing', { sort: 'price-asc' });
    expect(ids(cheapFirst.additional.items)).toEqual(['4', '1']);
  });
});

describe('CatalogService.search', () => {
  it('matches the title case-insensitively', async () => {
    expect(ids((await catalog().search('SLIM fit')).items)).toEqual(['2', '4']);
  });

  it('matches the description and category', async () => {
    expect(ids((await catalog().search('ssd')).items)).toEqual(['6']);
    expect(ids((await catalog().search('jewel')).items)).toEqual(['5']);
  });

  it('trims the term and returns only matching products', async () => {
    expect(ids((await catalog().search('  bracelet  ')).items)).toEqual(['5']);
    expect((await catalog().search('no such thing')).items).toEqual([]);
  });

  it('supports filters, sorting and pagination', async () => {
    const page = await catalog().search('slim', { sort: 'rating', pageSize: 1 });
    expect(page).toMatchObject({ totalItems: 2, totalPages: 2 });
    expect(ids(page.items)).toEqual(['2']);
  });

  it('rejects an empty term', async () => {
    await expect(catalog().search('   ')).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CatalogService.getProduct', () => {
  it('returns the product or throws NotFoundError', async () => {
    expect((await catalog().getProduct('3')).title).toBe('Cotton Jacket');
    await expect(catalog().getProduct('999')).rejects.toBeInstanceOf(NotFoundError);
  });
});
