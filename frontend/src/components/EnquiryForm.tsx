import { type FormEvent, useEffect, useRef, useState } from 'react';
import { revealElement } from '../scroll';

export interface EnquiryFormValues {
  name: string;
  email: string;
  phone: string;
  message: string;
  /** Honeypot: hidden from people; bots that fill it in are ignored by the API. */
  website: string;
}

interface EnquiryFormProps {
  productTitle: string;
  submitting: boolean;
  /** Server error to show above the form. The form keeps its values so the customer can retry. */
  error?: string;
  onSubmit: (values: EnquiryFormValues) => void;
  onCancel: () => void;
}

const empty: EnquiryFormValues = { name: '', email: '', phone: '', message: '', website: '' };

export function EnquiryForm({ productTitle, submitting, error, onSubmit, onCancel }: EnquiryFormProps) {
  const [values, setValues] = useState(empty);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // On open: bring the form into view (on mobile it starts below the fold) and move
  // focus to its heading for keyboard/screen-reader users without opening the keyboard.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    revealElement(formRef.current);
  }, []);

  // A new error appears at the top of the form, away from the submit button; show it.
  useEffect(() => {
    if (error) revealElement(errorRef.current);
  }, [error]);

  const update = (field: keyof EnquiryFormValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form ref={formRef} className="enquiry-form" onSubmit={handleSubmit} aria-labelledby="enquiry-heading">
      <h2 id="enquiry-heading" ref={headingRef} tabIndex={-1}>
        Enquire about {productTitle}
      </h2>
      {error && (
        <p ref={errorRef} className="status status--error" role="alert">
          {error}
        </p>
      )}

      <label>
        <span>
          Name <span aria-hidden="true">*</span>
        </span>
        <input required maxLength={100} autoComplete="name" value={values.name} onChange={update('name')} />
      </label>
      <label>
        <span>
          Email <span aria-hidden="true">*</span>
        </span>
        <input
          required
          type="email"
          maxLength={254}
          autoComplete="email"
          value={values.email}
          onChange={update('email')}
        />
      </label>
      <label>
        <span>
          Phone <span className="muted">(optional)</span>
        </span>
        <input type="tel" maxLength={30} autoComplete="tel" value={values.phone} onChange={update('phone')} />
      </label>
      <label>
        <span>
          Message <span className="muted">(optional)</span>
        </span>
        <textarea rows={4} maxLength={2000} value={values.message} onChange={update('message')} />
      </label>

      {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={values.website} onChange={update('website')} />
        </label>
      </div>

      <div className="enquiry-form__actions">
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send enquiry'}
        </button>
        <button type="button" className="button button--secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
