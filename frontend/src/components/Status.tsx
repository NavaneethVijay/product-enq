import type { ReactNode } from 'react';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="status muted" role="status">
      {label}
    </p>
  );
}

export function ErrorMessage({ title = 'Something went wrong', children }: { title?: string; children?: ReactNode }) {
  return (
    <div className="status status--error" role="alert">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
