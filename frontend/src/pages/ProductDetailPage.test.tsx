import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../api/client';
import { ProductDetailPage } from './ProductDetailPage';

const product: Product = {
  id: '3',
  title: 'Cotton Jacket',
  description: 'A warm jacket.',
  price: 55.99,
  category: "men's clothing",
  image: 'https://example.com/jacket.png',
  rating: { rate: 4.7, count: 500 },
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Routes fetch calls to canned responses; the enquiry response is chosen per test. */
function mockApi(enquiryResponse: Response) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/products/3') return json(200, product);
    if (url === '/api/products/999') return json(404, { error: { code: 'NOT_FOUND', message: 'Product "999" not found' } });
    if (url === '/api/enquiries' && init?.method === 'POST') return enquiryResponse;
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillAndSubmitEnquiry() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Enquire' }));
  await user.type(screen.getByLabelText(/Name/), 'Ann Lee');
  await user.type(screen.getByLabelText(/Email/), 'ann@example.com');
  await user.type(screen.getByLabelText(/Message/), 'Is it waterproof?');
  await user.click(screen.getByRole('button', { name: 'Send enquiry' }));
}

afterEach(() => vi.unstubAllGlobals());

describe('Product page enquiry', () => {
  it('shows product details, sends the enquiry and thanks the customer', async () => {
    const fetchMock = mockApi(json(202, { status: 'sent' }));
    renderAt('/products/3');

    expect(await screen.findByRole('heading', { name: 'Cotton Jacket' })).toBeInTheDocument();
    expect(screen.getByText('$55.99')).toBeInTheDocument();

    await fillAndSubmitEnquiry();

    expect(await screen.findByText('Thank you!')).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/enquiries')!;
    expect(JSON.parse(init!.body as string)).toEqual({
      productId: '3',
      name: 'Ann Lee',
      email: 'ann@example.com',
      message: 'Is it waterproof?',
    });
  });

  it('shows the error and keeps the form values when sending fails', async () => {
    mockApi(json(502, { error: { code: 'UPSTREAM_ERROR', message: 'The email could not be sent. Please try again later.' } }));
    renderAt('/products/3');

    await fillAndSubmitEnquiry();

    expect(await screen.findByRole('alert')).toHaveTextContent('The email could not be sent');
    expect(screen.queryByText('Thank you!')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toHaveValue('Ann Lee');
    expect(screen.getByRole('button', { name: 'Send enquiry' })).toBeEnabled();
  });

  it('clears the error when the form is closed and reopened', async () => {
    mockApi(json(502, { error: { code: 'UPSTREAM_ERROR', message: 'The email could not be sent. Please try again later.' } }));
    renderAt('/products/3');
    const user = userEvent.setup();

    await fillAndSubmitEnquiry();
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Enquire' }));

    expect(screen.getByRole('button', { name: 'Send enquiry' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('scrolls the opened form into view and focuses its heading', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    mockApi(json(202, { status: 'sent' }));
    renderAt('/products/3');

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Enquire' }));

    const heading = screen.getByRole('heading', { name: /Enquire about Cotton Jacket/ });
    expect(heading).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    expect(scrollIntoView.mock.contexts[0]).toBe(heading.closest('form'));
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it('shows a not-found message for an unknown product', async () => {
    mockApi(json(202, {}));
    renderAt('/products/999');
    expect(await screen.findByText("We couldn't find that product.")).toBeInTheDocument();
  });
});
