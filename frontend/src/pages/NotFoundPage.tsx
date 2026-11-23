import { Link } from 'react-router-dom';

export function NotFoundPage({ message = "We couldn't find that page." }: { message?: string }) {
  return (
    <section className="not-found">
      <h1>Not found</h1>
      <p>{message}</p>
      <Link to="/">Back to featured products</Link>
    </section>
  );
}
