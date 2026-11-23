import type { Product } from '../api/client';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  emptyMessage?: string;
}

export function ProductGrid({ products, emptyMessage = 'No products to show.' }: ProductGridProps) {
  if (products.length === 0) return <p className="empty-state">{emptyMessage}</p>;
  return (
    <ul className="product-grid">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
