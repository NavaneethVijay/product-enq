import { Router } from 'express';
import { z } from 'zod';
import type { CatalogService } from '../services/CatalogService.js';
import { listQuerySchema } from './listQuery.js';

const idParams = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'must be a valid product id'),
});

const searchQuery = z.object({
  q: z.string({ error: 'is required' }).trim().min(1, 'is required').max(100),
});

export function productsRouter(catalog: CatalogService): Router {
  const router = Router();

  // Registered before /:id so "featured" is not treated as an id.
  router.get('/featured', async (_req, res) => {
    res.json(await catalog.getFeatured());
  });

  router.get('/', async (req, res) => {
    const { q } = searchQuery.parse(req.query);
    const list = listQuerySchema.parse(req.query);
    res.json(await catalog.search(q, list));
  });

  router.get('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    res.json(await catalog.getProduct(id));
  });

  return router;
}
