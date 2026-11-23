import express, { type Express } from 'express';
import type { Config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import type { EmailProvider } from './ports/EmailProvider.js';
import type { ProductRepository } from './ports/ProductRepository.js';
import { categoriesRouter } from './routes/categories.js';
import { enquiriesRouter } from './routes/enquiries.js';
import { productsRouter } from './routes/products.js';
import { CatalogService } from './services/CatalogService.js';
import { EnquiryService } from './services/EnquiryService.js';

/** Everything the app needs from the outside world. Real adapters in server.ts, fakes in tests. */
export interface AppDeps {
  config: Config;
  productRepo: ProductRepository;
  emailProvider: EmailProvider;
}

export function createApp({ config, productRepo, emailProvider }: AppDeps): Express {
  const catalog = new CatalogService(productRepo, {
    featuredProductIds: config.featuredProductIds,
    topRated: config.topRated,
  });
  const enquiries = new EnquiryService(productRepo, emailProvider, {
    salesInboxEmail: config.salesInboxEmail,
  });

  const app = express();
  app.disable('x-powered-by');
  // Behind a proxy, use the real client IP (X-Forwarded-For) for rate limiting; 0 = no proxy.
  app.set('trust proxy', config.trustProxy);
  app.use(express.json({ limit: '10kb' }));

  app.use('/api/products', productsRouter(catalog));
  app.use('/api/categories', categoriesRouter(catalog));
  app.use('/api/enquiries', enquiriesRouter(enquiries));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
