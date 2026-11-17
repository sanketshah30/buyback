import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRight } from '../middleware/rights.middleware';
import {
  catalogRepository,
  partnerRepository,
  questionAnswerMappingRepository,
  questionnaireConfigRepository,
} from '../repositories';
import { QuestionnaireConfig } from '../types/domain';
import { requireBodyId } from '../utils/httpError';
import { allocateId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const questionnaireConfigRouter = Router();
questionnaireConfigRouter.use(requireAuth);

/**
 * Live buyback flow lookup - any authenticated user (promoters included).
 * POST + body per server/README.md.
 */
questionnaireConfigRouter.post('/resolve', async (req, res, next) => {
  try {
    const productCategoryId = parseId(req.body?.productCategoryId);
    const brandId = req.body?.brandId !== undefined && req.body?.brandId !== null ? parseId(req.body.brandId) : undefined;
    const partnerId = req.body?.partnerId !== undefined && req.body?.partnerId !== null ? parseId(req.body.partnerId) : undefined;
    const { language } = req.body as { language?: string };
    if (!productCategoryId) {
      return res.status(400).json({ error: 'productCategoryId is required and cannot be 0/null' });
    }

    const category = await catalogRepository.getCategory(productCategoryId);
    if (!category) return res.status(404).json({ error: 'Unknown productCategoryId' });

    const questions = await questionnaireConfigRepository.resolve(
      productCategoryId,
      brandId,
      partnerId,
      language || 'en',
    );
    return res.json({ productCategoryId, brandId: brandId ?? null, partnerId: partnerId ?? null, questions });
  } catch (err) {
    return next(err);
  }
});

const admin = Router();
admin.use(requireRight('manage_pricing'));

admin.post('/search', async (req, res, next) => {
  try {
    const productCategoryId = req.body?.productCategoryId !== undefined ? parseId(req.body.productCategoryId) : undefined;
    const brandId =
      req.body?.brandId !== undefined ? (req.body.brandId === null ? null : parseId(req.body.brandId)) : undefined;
    const partnerId =
      req.body?.partnerId !== undefined ? (req.body.partnerId === null ? null : parseId(req.body.partnerId)) : undefined;
    const { isActive } = req.body as { isActive?: boolean };
    const configs = await questionnaireConfigRepository.list({
      productCategoryId,
      brandId,
      partnerId,
      isActive,
    });
    return res.json(configs);
  } catch (err) {
    return next(err);
  }
});

admin.post('/', async (req, res, next) => {
  try {
    const productCategoryId = parseId(req.body?.productCategoryId);
    const brandId = req.body?.brandId !== undefined && req.body?.brandId !== null ? parseId(req.body.brandId) : undefined;
    const partnerId =
      req.body?.partnerId !== undefined && req.body?.partnerId !== null ? parseId(req.body.partnerId) : undefined;
    const questionAnswerId = parseId(req.body?.questionAnswerId);
    const { sequence } = req.body as { sequence?: number };

    if (!productCategoryId) return res.status(400).json({ error: 'productCategoryId is required and cannot be 0/null' });
    if (!questionAnswerId) return res.status(400).json({ error: 'questionAnswerId is required' });
    if (sequence === undefined || sequence === null || Number.isNaN(Number(sequence))) {
      return res.status(400).json({ error: 'sequence is required' });
    }

    const category = await catalogRepository.getCategory(productCategoryId);
    if (!category) return res.status(404).json({ error: 'Unknown productCategoryId' });
    if (brandId !== undefined) {
      const brand = await catalogRepository.getBrand(brandId);
      if (!brand) return res.status(404).json({ error: 'Unknown brandId' });
    }
    if (partnerId !== undefined) {
      const partner = await partnerRepository.findById(partnerId);
      if (!partner) return res.status(404).json({ error: 'Unknown partnerId' });
    }
    const mapping = await questionAnswerMappingRepository.findById(questionAnswerId);
    if (!mapping) return res.status(404).json({ error: 'Unknown questionAnswerId' });

    const now = new Date().toISOString();
    const config: QuestionnaireConfig = {
      id: await allocateId('questionnaire_config'),
      productCategoryId,
      brandId: brandId ?? null,
      partnerId: partnerId ?? null,
      questionAnswerId,
      sequence: Number(sequence),
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

admin.post('/get', async (req, res, next) => {
  try {
    const config = await questionnaireConfigRepository.findById(requireBodyId(req.body));
    if (!config) return res.status(404).json({ error: 'Questionnaire config not found' });
    return res.json(config);
  } catch (err) {
    return next(err);
  }
});

admin.post('/update', async (req, res, next) => {
  try {
    const id = requireBodyId(req.body);
    const existing = await questionnaireConfigRepository.findById(id);
    if (!existing) return res.status(404).json({ error: 'Questionnaire config not found' });

    const { sequence, isActive } = req.body as { sequence?: number; isActive?: boolean };
    if (sequence !== undefined && (typeof sequence !== 'number' || Number.isNaN(sequence))) {
      return res.status(400).json({ error: 'sequence must be a number' });
    }
    const updated = await questionnaireConfigRepository.update(id, { sequence, isActive });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

questionnaireConfigRouter.use(admin);
