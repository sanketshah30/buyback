import { Router } from 'express';
import { catalogRepository } from '../repositories';

export const catalogRouter = Router();

catalogRouter.get('/categories', async (_req, res, next) => {
  try {
    res.json(await catalogRepository.listCategories());
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/brands', async (req, res, next) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });
    return res.json(await catalogRepository.listBrands(categoryId));
  } catch (err) {
    return next(err);
  }
});

catalogRouter.get('/models', async (req, res, next) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const brandId = req.query.brandId as string | undefined;
    if (!categoryId || !brandId) {
      return res.status(400).json({ error: 'categoryId and brandId are required' });
    }
    return res.json(await catalogRepository.listModels(categoryId, brandId));
  } catch (err) {
    return next(err);
  }
});

catalogRouter.get('/skus', async (req, res, next) => {
  try {
    const modelId = req.query.modelId as string | undefined;
    if (!modelId) return res.status(400).json({ error: 'modelId is required' });
    return res.json(await catalogRepository.listSkus(modelId));
  } catch (err) {
    return next(err);
  }
});

catalogRouter.get('/questions', async (req, res, next) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });
    return res.json(await catalogRepository.listQuestions(categoryId));
  } catch (err) {
    return next(err);
  }
});
