import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Product } from '../api/client';
import { EnquiryForm, type EnquiryFormValues } from '../components/EnquiryForm';
import { ProductDetails } from '../components/ProductDetails';
import { ErrorMessage, Loading } from '../components/Status';
import { useEnquiry } from '../hooks/useEnquiry';
import { useProduct } from '../hooks/useProducts';
import { NotFoundPage } from './NotFoundPage';

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const product = useProduct(id);

  if (product.status === 'loading') return <Loading />;
  if (product.status === 'error') {
    if (product.error.isNotFound) return <NotFoundPage message="We couldn't find that product." />;
    return <ErrorMessage>{product.error.message}</ErrorMessage>;
  }

  return (
    <ProductDetails product={product.data}>
      {/* key resets the enquiry state when navigating to another product. */}
      <EnquirySection key={product.data.id} product={product.data} />
    </ProductDetails>
  );
}

function EnquirySection({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const { state, submit, reset } = useEnquiry();

  if (state.status === 'sent') {
    return (
      <div className="status status--success" role="status">
        <strong>Thank you!</strong>
        <p>Your enquiry about {product.title} has been sent. Our sales team will be in touch soon.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className="button button--large" onClick={() => setOpen(true)}>
        Enquire
      </button>
    );
  }

  const handleSubmit = (values: EnquiryFormValues) =>
    submit({
      productId: product.id,
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      message: values.message || undefined,
      website: values.website || undefined,
    });

  return (
    <EnquiryForm
      productTitle={product.title}
      submitting={state.status === 'submitting'}
      error={state.status === 'error' ? state.error.message : undefined}
      onSubmit={handleSubmit}
      onCancel={() => {
        setOpen(false);
        reset();
      }}
    />
  );
}
