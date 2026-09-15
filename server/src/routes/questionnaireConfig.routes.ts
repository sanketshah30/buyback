import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth.middleware';
import {
  catalogRepository,
  partnerRepository,
  questionAnswerMappingRepository,
  questionnaireConfigRepository,
} from '../repositories';
import { QuestionnaireConfig } from '../types/domain';

export const questionnaireConfigRouter = Router();
questionnaireConfigRouter.use(requireAuth);

/**
 * The main capability this module exists for: given the product category
 * (required) and optional brand/partner the app is currently showing, return
 * the applicable questionnaire - already resolved to the single most
 * specific matching tier and sorted by sequence. See
 * QuestionnaireConfigRepository.resolve() for the precedence rules.
 *
 * POST + body (not GET + query string) per the module-wide convention -
 * see server/README.md.
 */
questionnaireConfigRouter.post('/resolve', async (req, res, next) => {
  try {
    const { productCategoryId, brandId, partnerId, language } = req.body as {
      productCategoryId?: string;
      brandId?: string;
      partnerId?: string;
      language?: string;
    };
    if (!productCategoryId) {
      return res.status(400).json({ error: 'productCategoryId is required and cannot be 0/null' });
    }

    const category = await catalogRepository.getCategory(productCategoryId);
    if (!category) return res.status(404).json({ error: 'Unknown productCategoryId' });

    const questions = await questionnaireConfigRepository.resolve(
      productCategoryId,
      brandId || undefined,
      partnerId || undefined,
      language || 'en',
    );
    return res.json({ productCategoryId, brandId: brandId ?? null, partnerId: partnerId ?? null, questions });
  } catch (err) {
    return next(err);
  }
});

// List/search is POST + body, never GET + query string.
questionnaireConfigRouter.post('/search', async (req, res, next) => {
  try {
    const { productCategoryId, brandId, partnerId, isActive } = req.body as {
      productCategoryId?: string;
      brandId?: string | null;
      partnerId?: string | null;
      isActive?: boolean;
    };
    const configs = await questionnaireConfigRepository.list({ productCategoryId, brandId, partnerId, isActive });
    return res.json(configs);
  } catch (err) {
    return next(err);
  }
});

questionnaireConfigRouter.post('/', async (req, res, next) => {
  try {
    const { productCategoryId, brandId, partnerId, questionAnswerId, sequence } = req.body as {
      productCategoryId?: string;
      brandId?: string | null;
      partnerId?: string | null;
      questionAnswerId?: string;
      sequence?: number;
    };

    if (!productCategoryId) return res.status(400).json({ error: 'productCategoryId is required and cannot be 0/null' });
    if (!questionAnswerId) return res.status(400).json({ error: 'questionAnswerId is required' });
    if (sequence === undefined || sequence === null) return res.status(400).json({ error: 'sequence is required' });

    const category = await catalogRepository.getCategory(productCategoryId);
    if (!category) return res.status(404).json({ error: 'Unknown productCategoryId' });
    if (brandId) {
      const brand = await catalogRepository.getBrand(brandId);
      if (!brand) return res.status(404).json({ error: 'Unknown brandId' });
    }
    if (partnerId) {
      const partner = await partnerRepository.findById(partnerId);
      if (!partner) return res.status(404).json({ error: 'Unknown partnerId' });
    }
    const mapping = await questionAnswerMappingRepository.findById(questionAnswerId);
    if (!mapping) return res.status(404).json({ error: 'Unknown questionAnswerId' });

    const now = new Date().toISOString();
    const config: QuestionnaireConfig = {
      id: uuid(),
      productCategoryId,
      brandId: brandId ?? null,
      partnerId: partnerId ?? null,
      questionAnswerId,
      sequence,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await questionnaireConfigRepository.create(config);
    return res.status(201).json(config);
  } catch (err) {
    return next(err);
  }
});

questionnaireConfigRouter.get('/:id', async (req, res, next) => {
  try {
    const config = await questionnaireConfigRepository.findById(req.params.id);
    if (!config) return res.status(404).json({ error: 'Questionnaire config not found' });
    return res.json(config);
  } catch (err) {
    return next(err);
  }
});

questionnaireConfigRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await questionnaireConfigRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Questionnaire config not found' });

    const { sequence, isActive } = req.body as { sequence?: number; isActive?: boolean };
    const updated = await questionnaireConfigRepository.update(req.params.id, { sequence, isActive });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
