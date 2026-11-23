import { Link } from 'react-router-dom';
import type { Product } from '../api/client';
import { formatPrice } from '../format';
import { Rating } from './Rating';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/products/${product.id}`} className="product-card">
      <div className="product-card__image">
        <img src={product.image} alt="" loading="lazy" />
      </div>
      <h3 className="product-card__title">{product.title}</h3>
      <div className="product-card__meta">
        <span className="price">{formatPrice(product.price)}</span>
        <Rating rate={product.rating.rate} count={product.rating.count} />
      </div>
    </Link>
  );
}
