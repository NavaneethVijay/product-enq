import { ProductGrid } from '../components/ProductGrid';
import { ErrorMessage, Loading } from '../components/Status';
import { useFeaturedProducts } from '../hooks/useProducts';

export function HomePage() {
  const featured = useFeaturedProducts();

  return (
    <section>
      <p className="eyebrow">Hand-picked</p>
      <h1>Featured products</h1>
      <p className="page-intro">A selection of our favourite products right now.</p>
      {featured.status === 'loading' && <Loading />}
      {featured.status === 'error' && <ErrorMessage>{featured.error.message}</ErrorMessage>}
      {featured.status === 'success' && (
        <ProductGrid products={featured.data} emptyMessage="No featured products yet." />
      )}
    </section>
  );
}
