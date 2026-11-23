import { readFile } from 'node:fs/promises';
import { FakeStoreRepository, parseFakeStoreProducts } from './adapters/FakeStoreRepository.js';
import { SmtpEmailProvider } from './adapters/SmtpEmailProvider.js';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

// Composition root: the only place that picks concrete adapters.
// Swapping the data source or email provider means changing a line here.
const config = loadConfig();

const snapshotPath = new URL('../data/products.json', import.meta.url);
const fallbackProducts = parseFakeStoreProducts(JSON.parse(await readFile(snapshotPath, 'utf8')));

const productRepo = new FakeStoreRepository({
  baseUrl: config.fakeStoreBaseUrl,
  cacheTtlMs: config.cacheTtlSeconds * 1000,
  fallbackProducts,
});
const emailProvider = SmtpEmailProvider.fromConfig(config.smtp);

const app = createApp({ config, productRepo, emailProvider });

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
