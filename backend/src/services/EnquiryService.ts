import type { EnquiryInput } from '../domain/enquiry.js';
import { NotFoundError } from '../domain/errors.js';
import type { Product } from '../domain/product.js';
import type { EmailMessage, EmailProvider } from '../ports/EmailProvider.js';
import type { ProductRepository } from '../ports/ProductRepository.js';

export interface EnquiryOptions {
  salesInboxEmail: string;
}

/** Turns a customer enquiry into an email to the sales inbox. */
export class EnquiryService {
  constructor(
    private readonly repo: ProductRepository,
    private readonly email: EmailProvider,
    private readonly options: EnquiryOptions,
  ) {}

  async submit(input: EnquiryInput): Promise<void> {
    if (input.website?.trim()) {
      // Looks like a bot. Pretend it worked so it learns nothing, but send no email.
      console.warn('Enquiry dropped: honeypot field was filled in.');
      return;
    }
    const product = await this.repo.getById(input.productId);
    if (!product) throw new NotFoundError(`Product "${input.productId}" not found`);
    await this.email.send(buildEnquiryEmail(input, product, this.options.salesInboxEmail));
  }
}

export function buildEnquiryEmail(input: EnquiryInput, product: Product, to: string): EmailMessage {
  const price = `$${product.price.toFixed(2)}`;
  const rows: [string, string][] = [
    ['Product', `${product.title} (id ${product.id})`],
    ['Price', price],
    ['Name', input.name],
    ['Email', input.email],
    ['Phone', input.phone ?? '-'],
    ['Message', input.message ?? '-'],
  ];

  const text = ['New product enquiry', '', ...rows.map(([label, value]) => `${label}: ${value}`)].join('\n');
  const html = `<h2>New product enquiry</h2>
<table cellpadding="6">
${rows.map(([label, value]) => `  <tr><th align="left" valign="top">${label}</th><td>${escapeHtml(value).replace(/\n/g, '<br>')}</td></tr>`).join('\n')}
</table>`;

  return {
    to,
    // Replies go to the customer; From stays our own address (SPF/DMARC).
    replyTo: input.email,
    subject: `New enquiry: ${product.title}`.replace(/[\r\n]+/g, ' '),
    text,
    html,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
