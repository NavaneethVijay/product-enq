import type { ReactNode } from 'react';
import type { Product } from '../api/client';
import { formatPrice } from '../format';
import { Rating } from './Rating';

/** Product information; `children` holds actions such as the enquiry area. */
export function ProductDetails({ product, children }: { product: Product; children?: ReactNode }) {
  return (
    <article className="product-details">
      <div className="product-details__image">
        <img src={product.image} alt={product.title} />
      </div>
      <div className="product-details__info">
        <p className="eyebrow">{product.category}</p>
        <h1>{product.title}</h1>
        <p className="product-details__price price">{formatPrice(product.price)}</p>
        <Rating rate={product.rating.rate} count={product.rating.count} />
        <p className="product-details__description">{product.description}</p>
        {children}
      </div>
    </article>
  );
}
