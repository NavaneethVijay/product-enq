export function Rating({ rate, count }: { rate: number; count: number }) {
  return (
    <span className="rating" aria-label={`Rated ${rate} out of 5 from ${count} reviews`}>
      <span className="rating__star" aria-hidden="true">★</span> {rate.toFixed(1)}{' '}
      <span className="muted">({count})</span>
    </span>
  );
}
