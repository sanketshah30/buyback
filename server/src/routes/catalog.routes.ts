import { Router } from 'express';
import { catalogRepository } from '../repositories';

export const catalogRouter = Router();

/**
 * Every catalog lookup is a POST with parameters in the JSON body, never in
 * the URL/query string - this keeps filter values (which can include
 * partner/internal identifiers) out of server access logs, proxy logs, and
 * browser history. These are still pure reads (no state is mutated); POST is
 * used purely as the transport for parameters that a real GET+query-string
 * request would otherwise expose. (Browsers' fetch()/XHR do not allow a body
 * on GET/HEAD requests, so POST is also the only option that works from the
 * frontend as-is.)
 */

catalogRouter.post('/categories', async (_req, res, next) => {
  try {
    res.json(await catalogRepository.listCategories());
  } catch (err) {
    next(err);
  }
});

catalogRouter.post('/brands', async (req, res, next) => {
  try {
    const { categoryId } = req.body as { categoryId?: string };
    if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });
    return res.json(await catalogRepository.listBrandsByCategory(categoryId));
  } catch (err) {
    return next(err);
  }
});

catalogRouter.post('/products', async (req, res, next) => {
  try {
    const { categoryId, brandId } = req.body as { categoryId?: string; brandId?: string };
    if (!categoryId || !brandId) {
      return res.status(400).json({ error: 'categoryId and brandId are required' });
    }
    return res.json(await catalogRepository.listProducts(categoryId, brandId));
  } catch (err) {
    return next(err);
  }
});

catalogRouter.post('/skus', async (req, res, next) => {
  try {
    const { productId } = req.body as { productId?: string };
    if (!productId) return res.status(400).json({ error: 'productId is required' });
    return res.json(await catalogRepository.listSkus(productId));
  } catch (err) {
    return next(err);
  }
});

catalogRouter.post('/sku-aliases', async (req, res, next) => {
  try {
    const { skuId } = req.body as { skuId?: string };
    if (!skuId) return res.status(400).json({ error: 'skuId is required' });
    return res.json(await catalogRepository.listSkuAliases(skuId));
  } catch (err) {
    return next(err);
  }
});

catalogRouter.post('/questions', async (req, res, next) => {
  try {
    const { categoryId } = req.body as { categoryId?: string };
    if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });
    return res.json(await catalogRepository.listQuestions(categoryId));
  } catch (err) {
    return next(err);
  }
});
