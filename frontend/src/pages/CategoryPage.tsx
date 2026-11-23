import { useParams } from 'react-router-dom';
import { ProductGrid } from '../components/ProductGrid';
import { ErrorMessage, Loading } from '../components/Status';
import { useCategoryProducts } from '../hooks/useProducts';
import { NotFoundPage } from './NotFoundPage';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const result = useCategoryProducts(slug);

  if (result.status === 'loading') return <Loading />;
  if (result.status === 'error') {
    if (result.error.isNotFound) return <NotFoundPage message="We couldn't find that category." />;
    return <ErrorMessage>{result.error.message}</ErrorMessage>;
  }

  const { category, topRated, additional } = result.data;
  return (
    <>
      <p className="eyebrow">Category</p>
      <h1 className="capitalize">{category.name}</h1>
      <section aria-labelledby="top-rated-heading">
        <h2 id="top-rated-heading">Top rated</h2>
        <ProductGrid products={topRated} emptyMessage="No top rated products in this category yet." />
      </section>
      {additional.items.length > 0 && (
        <section aria-labelledby="more-heading">
          <h2 id="more-heading">More in {category.name}</h2>
          <ProductGrid products={additional.items} />
        </section>
      )}
    </>
  );
}
