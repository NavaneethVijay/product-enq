import { describe, expect, it } from 'vitest';
import { buildEnquiryEmail } from '../services/EnquiryService.js';
import { makeProduct } from './fakes.js';

const product = makeProduct({ id: '7', title: 'Silver Ring', price: 9.5 });

describe('buildEnquiryEmail', () => {
  it('addresses the sales inbox, replies to the customer and includes product details', () => {
    const email = buildEnquiryEmail(
      { productId: '7', name: 'Ann Lee', email: 'ann@example.com', phone: '+44 7700 900123', message: 'Is it in stock?' },
      product,
      'sales@example.com',
    );
    expect(email.to).toBe('sales@example.com');
    expect(email.replyTo).toBe('ann@example.com');
    expect(email.subject).toBe('New enquiry: Silver Ring');
    for (const part of ['Silver Ring (id 7)', '$9.50', 'Ann Lee', 'ann@example.com', '+44 7700 900123', 'Is it in stock?']) {
      expect(email.text).toContain(part);
    }
  });

  it('escapes customer input in the HTML body', () => {
    const email = buildEnquiryEmail(
      { productId: '7', name: '<b>Ann</b>', email: 'ann@example.com', message: '<script>alert(1)</script>' },
      product,
      'sales@example.com',
    );
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).toContain('&lt;b&gt;Ann&lt;/b&gt;');
  });
});
