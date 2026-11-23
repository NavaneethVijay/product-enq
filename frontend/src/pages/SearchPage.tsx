import { useSearchParams } from 'react-router-dom';
import { ProductGrid } from '../components/ProductGrid';
import { ErrorMessage, Loading } from '../components/Status';
import { useSearchResults } from '../hooks/useProducts';

export function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get('q') ?? '').trim();

  if (!query) {
    return (
      <>
        <h1>Search</h1>
        <p className="muted">Enter a search term above and press Search.</p>
      </>
    );
  }
  // Separate component so the hook only runs with a non-empty query.
  return <SearchResults query={query} />;
}

function SearchResults({ query }: { query: string }) {
  const results = useSearchResults(query);

  return (
    <>
      <p className="eyebrow">Search</p>
      <h1>Results for “{query}”</h1>
      {results.status === 'loading' && <Loading label="Searching…" />}
      {results.status === 'error' && <ErrorMessage>{results.error.message}</ErrorMessage>}
      {results.status === 'success' && (
        <>
          <p className="page-intro" role="status">
            {results.data.totalItems} {results.data.totalItems === 1 ? 'product' : 'products'} found
          </p>
          <ProductGrid products={results.data.items} emptyMessage={`No products match “${query}”.`} />
        </>
      )}
    </>
  );
}
