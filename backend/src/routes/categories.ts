import { Router } from 'express';
import { z } from 'zod';
import type { CatalogService } from '../services/CatalogService.js';
import { listQuerySchema } from './listQuery.js';

const slugParams = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,64}$/, 'must be a valid category slug'),
});

export function categoriesRouter(catalog: CatalogService): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await catalog.getCategories());
  });

  router.get('/:slug', async (req, res) => {
    const { slug } = slugParams.parse(req.params);
    const list = listQuerySchema.parse(req.query);
    res.json(await catalog.getCategoryProducts(slug, list));
  });

  return router;
}
