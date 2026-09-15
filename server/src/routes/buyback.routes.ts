import { NextFunction, Response, Router } from 'express';
import { catalogRepository, buybackRepository } from '../repositories';
import { AuthedRequest, requireAuth } from '../middleware/auth.middleware';
import { toPublicUrl, upload } from '../middleware/upload.middleware';
import { assessmentService } from '../services/assessment.service';
import { authService } from '../services/auth.service';
import { diagnosisService } from '../services/diagnosis.service';
import { notificationService } from '../services/notification.service';
import { applyDiagnosisAdjustment, applyNoDiagnosisDrop, computeMaxValue } from '../services/valuation.service';
import { BuybackRequest, QuestionnaireAnswer } from '../types/domain';
import { dateKey, formatBuybackDisplayId } from '../utils/id';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const buybackRouter = Router();
buybackRouter.use(requireAuth);

const IMEI_REGEX = /^[0-9]{16}$/;
const SERIAL_REGEX = /^[a-zA-Z0-9]{12,16}$/;

async function loadOwnedBuyback(rawId: string, userId: number): Promise<BuybackRequest> {
  const id = parseId(rawId);
  if (id === undefined) {
    throw Object.assign(new Error('Invalid buyback id'), { status: 400 });
  }
  const request = await buybackRepository.findById(id);
  if (!request || request.userId !== userId) {
    throw Object.assign(new Error('Buyback request not found'), { status: 404 });
  }
  return request;
}

/**
 * Verifies buyback ownership *before* the multer upload middleware runs, so a
 * request for a buyback ID the caller doesn't own is rejected before any file
 * is ever written to disk under that ID's upload folder.
 */
async function requireOwnedBuybackForUpload(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    await loadOwnedBuyback(req.params.id, req.auth!.userId);
    next();
  } catch (err) {
    next(err);
  }
}

buybackRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const history = await buybackRepository.listByUser(req.auth!.userId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

buybackRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const categoryId = parseId(req.body?.categoryId);
    const brandId = parseId(req.body?.brandId);
    if (!categoryId || !brandId) {
      return res.status(400).json({ error: 'categoryId and brandId are required' });
    }
    const category = await catalogRepository.getCategory(categoryId);
    const brand = await catalogRepository.getBrand(brandId);
    if (!category || !brand) {
      return res.status(404).json({ error: 'Unknown category or brand' });
    }

    const now = new Date().toISOString();
    const request: BuybackRequest = {
      id: nextId('buyback_requests'),
      userId: req.auth!.userId,
      status: 'draft',
      category,
      brand,
      createdAt: now,
      updatedAt: now,
    };
    await buybackRepository.create(request);
    return res.status(201).json(request);
  } catch (err) {
    return next(err);
  }
});

buybackRouter.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    res.json(request);
  } catch (err) {
    next(err);
  }
});

buybackRouter.patch('/:id/device', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    const { value } = req.body as { value?: string };
    if (!request.category) return res.status(400).json({ error: 'Select a category first' });
    if (!value) return res.status(400).json({ error: 'value is required' });

    const isSmartphone = request.category.type === 'smartphone';
    if (isSmartphone && !IMEI_REGEX.test(value)) {
      return res.status(400).json({ error: 'IMEI must be exactly 16 numeric digits' });
    }
    if (!isSmartphone && !SERIAL_REGEX.test(value)) {
      return res.status(400).json({ error: 'Serial number must be 12-16 alphanumeric characters' });
    }

    const updated = await buybackRepository.update(request.id, {
      identifier: { type: isSmartphone ? 'imei' : 'serial', value },
      status: 'device_captured',
    });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

buybackRouter.patch('/:id/product', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    const productId = parseId(req.body?.productId);
    const skuId = parseId(req.body?.skuId);
    if (!productId || !skuId) return res.status(400).json({ error: 'productId and skuId are required' });
    if (!request.category || !request.brand) {
      return res.status(400).json({ error: 'Select a category and brand first' });
    }

    const product = await catalogRepository.getProduct(productId);
    const sku = await catalogRepository.getSku(skuId);
    if (!product || !sku) return res.status(404).json({ error: 'Unknown product or SKU' });

    // The product/SKU catalog is scoped by category+brand on the client, but the
    // server must not trust that pairing - otherwise a low-value buyback could be
    // patched with an unrelated high-value product to inflate its valuation.
    if (product.categoryId !== request.category.id || product.brandId !== request.brand.id) {
      return res.status(400).json({ error: "Selected product does not belong to this buyback's category/brand" });
    }
    if (sku.productId !== product.id) {
      return res.status(400).json({ error: 'Selected SKU does not belong to the selected product' });
    }

    const updated = await buybackRepository.update(request.id, {
      product,
      sku,
      status: 'product_selected',
    });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

buybackRouter.post('/:id/assessment/questionnaire', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    if (!request.category) return res.status(400).json({ error: 'Select a category first' });
    const { answers } = req.body as { answers?: QuestionnaireAnswer[] };
    if (!answers?.length) return res.status(400).json({ error: 'answers are required' });

    // Trust nothing from the client about completeness - re-derive it from the
    // category's actual configured questionnaire, otherwise a client could
    // submit only the bonus "accessories" answer and skip every damage
    // question to inflate the valuation.
    const questions = await catalogRepository.listQuestions(request.category.id);
    const answersByQuestion = new Map(answers.map((a) => [a.questionId, a]));
    for (const question of questions) {
      const answer = answersByQuestion.get(question.id);
      if (!answer || answer.optionIds.length === 0) {
        return res.status(400).json({ error: `Missing answer for question "${question.id}"` });
      }
      const validOptionIds = new Set(question.options.map((o) => o.id));
      if (!answer.optionIds.every((optionId) => validOptionIds.has(optionId))) {
        return res.status(400).json({ error: `Invalid option selected for question "${question.id}"` });
      }
      if (question.type === 'single-choice' && answer.optionIds.length !== 1) {
        return res.status(400).json({ error: `Question "${question.id}" accepts exactly one option` });
      }
    }

    const updated = await buybackRepository.update(request.id, {
      assessmentMethod: 'questionnaire',
      questionnaireAnswers: answers,
      status: 'assessment_completed',
    });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

buybackRouter.post(
  '/:id/assessment/images',
  requireOwnedBuybackForUpload,
  upload.array('images', 6),
  async (req: AuthedRequest, res, next) => {
    try {
      const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
      if (!request.category) return res.status(400).json({ error: 'Select a category first' });

      const files = (req.files as Express.Multer.File[]) ?? [];
      if (files.length < 1) {
        return res.status(400).json({ error: 'At least one image is required (6 recommended: front, back, top, bottom, left, right)' });
      }

      const questions = await catalogRepository.listQuestions(request.category.id);
      const aiAssessment = assessmentService.runImageAssessment(questions, files.length);

      const updated = await buybackRepository.update(request.id, {
        assessmentMethod: 'image',
        assessmentImageUrls: files.map((f) => toPublicUrl(request.id, f.filename)),
        aiAssessment,
        questionnaireAnswers: aiAssessment.generatedAnswers,
        status: 'assessment_completed',
      });
      return res.json(updated);
    } catch (err) {
      return next(err);
    }
  },
);

buybackRouter.post(
  '/:id/assessment/video',
  requireOwnedBuybackForUpload,
  upload.single('video'),
  async (req: AuthedRequest, res, next) => {
    try {
      const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
      if (!request.category) return res.status(400).json({ error: 'Select a category first' });
      if (!req.file) return res.status(400).json({ error: 'A video file is required' });

      const questions = await catalogRepository.listQuestions(request.category.id);
      const aiAssessment = assessmentService.runVideoAssessment(questions);

      const updated = await buybackRepository.update(request.id, {
        assessmentMethod: 'video',
        assessmentVideoUrl: toPublicUrl(request.id, req.file.filename),
        aiAssessment,
        questionnaireAnswers: aiAssessment.generatedAnswers,
        status: 'assessment_completed',
      });
      return res.json(updated);
    } catch (err) {
      return next(err);
    }
  },
);

buybackRouter.post('/:id/valuation', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    if (!request.product || !request.sku || !request.category) {
      return res.status(400).json({ error: 'Product details must be selected before valuation' });
    }
    if (!request.questionnaireAnswers?.length) {
      return res.status(400).json({ error: 'Physical assessment must be completed before valuation' });
    }

    const questions = await catalogRepository.listQuestions(request.category.id);
    const basePrice = request.product.basePrice + request.sku.priceModifier;
    const maxValue = computeMaxValue(basePrice, questions, request.questionnaireAnswers);

    const sequence = await buybackRepository.nextDailySequence(dateKey());
    const displayId = formatBuybackDisplayId(sequence);

    const updated = await buybackRepository.update(request.id, {
      displayId,
      maxValue,
      status: 'valuation_ready',
    });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

buybackRouter.post('/:id/diagnosis/initiate', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    if (request.maxValue === undefined) {
      return res.status(400).json({ error: 'Run valuation before starting diagnosis' });
    }
    const diagnosis = diagnosisService.initiate(request.id);
    const updated = await buybackRepository.update(request.id, {
      withDiagnosis: true,
      diagnosis,
      status: 'diagnosis_pending',
    });
    return res.status(201).json(updated);
  } catch (err) {
    return next(err);
  }
});

buybackRouter.get('/:id/diagnosis/status', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    if (!request.diagnosis) {
      return res.status(400).json({ error: 'Diagnosis has not been initiated' });
    }

    const diagnosis = diagnosisService.poll(request.diagnosis);
    let patch: Partial<BuybackRequest> = { diagnosis };

    if (diagnosis.status === 'completed' && request.maxValue !== undefined) {
      const finalValue = applyDiagnosisAdjustment(request.maxValue, diagnosis.resultAdjustmentPercent ?? 0);
      patch = { ...patch, finalValue, status: 'value_finalized' };
    } else if (diagnosis.status !== request.diagnosis.status) {
      patch = { ...patch, status: 'diagnosis_pending' };
    }

    const updated = await buybackRepository.update(request.id, patch);
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

buybackRouter.post('/:id/finalize-value', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    const { withDiagnosis } = req.body as { withDiagnosis?: boolean };
    if (request.maxValue === undefined) {
      return res.status(400).json({ error: 'Run valuation first' });
    }

    if (withDiagnosis) {
      return res.status(400).json({ error: 'Use /diagnosis/initiate then poll /diagnosis/status for the diagnosis path' });
    }

    const finalValue = applyNoDiagnosisDrop(request.maxValue);
    const updated = await buybackRepository.update(request.id, {
      withDiagnosis: false,
      finalValue,
      status: 'value_finalized',
    });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

buybackRouter.post('/:id/customer', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    const { name, email, mobile } = req.body as { name?: string; email?: string; mobile?: string };
    if (!name || !email || !mobile) {
      return res.status(400).json({ error: 'name, email and mobile are required' });
    }
    if (request.finalValue === undefined) {
      return res.status(400).json({ error: 'Final value must be determined first' });
    }

    await buybackRepository.update(request.id, {
      customer: { name, email, mobile },
      status: 'customer_info_pending',
    });

    const otp = await authService.requestOtp(mobile, 'buyback-confirmation', request.id);
    await notificationService.sendEmail(email, 'Your buyback OTP', `Your OTP is ${otp.devOtp ?? '******'}.`);

    const updated = await buybackRepository.update(request.id, {
      customerOtp: { requestId: otp.requestId, verified: false },
    });

    return res.status(201).json({ request: updated, otpRequestId: otp.requestId, devOtp: otp.devOtp });
  } catch (err) {
    return next(err);
  }
});

buybackRouter.post('/:id/customer/resend-otp', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    const { channel } = req.body as { channel?: 'sms' | 'call' };
    if (!request.customer) return res.status(400).json({ error: 'Customer details have not been submitted yet' });

    const otp = await authService.requestOtp(request.customer.mobile, 'buyback-confirmation', request.id);

    if (channel === 'call') {
      await notificationService.sendSms(
        request.customer.mobile,
        `[mock voice call] Your buyback OTP is ${otp.devOtp ?? '******'}.`,
      );
    } else {
      await notificationService.sendEmail(request.customer.email, 'Your buyback OTP', `Your OTP is ${otp.devOtp ?? '******'}.`);
    }

    const updated = await buybackRepository.update(request.id, {
      customerOtp: { requestId: otp.requestId, verified: false },
    });

    return res.status(201).json({ request: updated, otpRequestId: otp.requestId, devOtp: otp.devOtp });
  } catch (err) {
    return next(err);
  }
});

buybackRouter.post('/:id/customer/verify-otp', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    const { otp } = req.body as { otp?: string };
    if (!request.customerOtp) return res.status(400).json({ error: 'No OTP has been requested yet' });
    if (!otp) return res.status(400).json({ error: 'otp is required' });

    await authService.verifyOtp(request.customerOtp.requestId, otp);

    const updated = await buybackRepository.update(request.id, {
      customerOtp: { ...request.customerOtp, verified: true },
      status: 'otp_verified',
    });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

buybackRouter.post(
  '/:id/documents',
  requireOwnedBuybackForUpload,
  upload.single('document'),
  async (req: AuthedRequest, res, next) => {
    try {
      const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
      if (!req.file) return res.status(400).json({ error: 'A document image is required' });

      const requiresProductImages = request.assessmentMethod === 'questionnaire';
      const updated = await buybackRepository.update(request.id, {
        documentProofUrl: toPublicUrl(request.id, req.file.filename),
        status: requiresProductImages ? 'document_uploaded' : 'product_images_uploaded',
      });
      return res.json(updated);
    } catch (err) {
      return next(err);
    }
  },
);

buybackRouter.post(
  '/:id/product-images',
  requireOwnedBuybackForUpload,
  upload.array('images', 6),
  async (req: AuthedRequest, res, next) => {
    try {
      const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
      const files = (req.files as Express.Multer.File[]) ?? [];
      if (files.length < 1) return res.status(400).json({ error: 'At least one product image is required' });

      const updated = await buybackRepository.update(request.id, {
        productImageUrls: files.map((f) => toPublicUrl(request.id, f.filename)),
        status: 'product_images_uploaded',
      });
      return res.json(updated);
    } catch (err) {
      return next(err);
    }
  },
);

buybackRouter.post('/:id/confirm', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    if (request.customerOtp?.verified !== true) {
      return res.status(400).json({ error: 'Customer OTP must be verified before confirmation' });
    }
    if (!request.documentProofUrl) {
      return res.status(400).json({ error: 'Document proof must be uploaded before confirmation' });
    }
    if (request.assessmentMethod === 'questionnaire' && !request.productImageUrls?.length) {
      return res.status(400).json({ error: '6-side product images are required for the questionnaire assessment path' });
    }

    const now = new Date().toISOString();
    const updated = await buybackRepository.update(request.id, {
      status: 'confirmed',
      confirmedAt: now,
    });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
