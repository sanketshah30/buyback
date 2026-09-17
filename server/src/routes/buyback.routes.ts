import { NextFunction, Response, Router } from 'express';
import { catalogRepository, buybackRepository, buybackStatusHistoryRepository, buybackVendorCalculationLogRepository, partnerLocationRepository, questionnaireConfigRepository, userRepository } from '../repositories';
import { AuthedRequest, requireAuth } from '../middleware/auth.middleware';
import { requireRight } from '../middleware/rights.middleware';
import { toPublicUrl, upload } from '../middleware/upload.middleware';
import { ResolvedQuestionnaireQuestion } from '../repositories/interfaces';
import { assessmentService } from '../services/assessment.service';
import { authService } from '../services/auth.service';
import * as buybackEngine from '../services/buybackEngine.service';
import { diagnosisService } from '../services/diagnosis.service';
import { notificationService } from '../services/notification.service';
import { applyDiagnosisAdjustment, applyNoDiagnosisDrop } from '../services/valuation.service';
import { BuybackRequest, PartnerLocation, QuestionnaireAnswer } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const buybackRouter = Router();
buybackRouter.use(requireAuth);
// Processing a buyback (starting one, capturing device info, assessing,
// confirming, ...) is gated behind the "process_buyback" right - only roles
// like Promoter carry it (see data/partner.seed.ts). Plain viewing (GET /)
// of one's own buyback history is intentionally not gated further here.
buybackRouter.use(requireRight('process_buyback'));

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

/** Every promoter/staff user acts on behalf of their own current partner location - see "Authentication, sessions & role-based access" in server/README.md. */
async function resolvePromoterLocation(userId: number): Promise<PartnerLocation> {
  const promoter = await userRepository.findById(userId);
  const location = promoter?.partnerLocationId !== undefined ? await partnerLocationRepository.findById(promoter.partnerLocationId) : undefined;
  if (!location) {
    throw Object.assign(new Error('Your account is not assigned to a partner location.'), { status: 422 });
  }
  return location;
}

/** The category/brand/(promoter's retail partner)-scoped questionnaire - see "Questionnaire configuration module" in server/README.md. */
async function resolveQuestionnaireFor(request: BuybackRequest, location: PartnerLocation): Promise<ResolvedQuestionnaireQuestion[]> {
  if (!request.category || !request.brand) {
    throw Object.assign(new Error('Select a category and brand first'), { status: 400 });
  }
  return questionnaireConfigRepository.resolve(request.category.id, request.brand.id, location.partnerId, 'en');
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
    const location = await resolvePromoterLocation(req.auth!.userId);
    const { answers } = req.body as { answers?: QuestionnaireAnswer[] };
    if (!answers?.length) return res.status(400).json({ error: 'answers are required' });

    // Trust nothing from the client about completeness - re-derive it from the
    // category+brand+partner's actual resolved questionnaire, otherwise a
    // client could submit only a bonus answer and skip every damage
    // question to inflate the valuation.
    const questions = await resolveQuestionnaireFor(request, location);
    const answersByQuestion = new Map(answers.map((a) => [a.questionId, a]));
    for (const question of questions) {
      const answer = answersByQuestion.get(question.questionId);
      if (!answer || answer.questionAnswerIds.length === 0) {
        return res.status(400).json({ error: `Missing answer for question "${question.text}"` });
      }
      const validQuestionAnswerIds = new Set(question.answers.map((a) => a.questionAnswerId));
      if (!answer.questionAnswerIds.every((qaId) => validQuestionAnswerIds.has(qaId))) {
        return res.status(400).json({ error: `Invalid answer selected for question "${question.text}"` });
      }
      if (question.type === 'single-choice' && answer.questionAnswerIds.length !== 1) {
        return res.status(400).json({ error: `Question "${question.text}" accepts exactly one answer` });
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
      const location = await resolvePromoterLocation(req.auth!.userId);

      const files = (req.files as Express.Multer.File[]) ?? [];
      if (files.length < 1) {
        return res.status(400).json({ error: 'At least one image is required (6 recommended: front, back, top, bottom, left, right)' });
      }

      const questions = await resolveQuestionnaireFor(request, location);
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
      const location = await resolvePromoterLocation(req.auth!.userId);
      if (!req.file) return res.status(400).json({ error: 'A video file is required' });

      const questions = await resolveQuestionnaireFor(request, location);
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

/**
 * Runs the full buyback request creation engine in sequence - see
 * "Buyback request creation engine (register / calculate / allocate)" in
 * server/README.md:
 *   1. register  - generate referenceId, stamp partnerLocationId, status "Request Created"
 *   2. calculate - log every eligible vendor's candidate buyback value
 *   3. allocate  - pick the highest, write it onto the parent request, status "Amount Calculated"
 */
buybackRouter.post('/:id/valuation', async (req: AuthedRequest, res, next) => {
  try {
    let request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    if (!request.product || !request.sku || !request.category || !request.brand) {
      return res.status(400).json({ error: 'Product details must be selected before valuation' });
    }
    const answers = request.questionnaireAnswers;
    if (!answers?.length) {
      return res.status(400).json({ error: 'Physical assessment must be completed before valuation' });
    }

    const location = await resolvePromoterLocation(req.auth!.userId);
    const userId = req.auth!.userId;

    request = await buybackEngine.register(request, location.id, userId);
    const candidates = await buybackEngine.calculate(request, location.id, answers, new Date());
    const allocated = await buybackEngine.allocate(request, candidates, location, userId);

    return res.json(allocated);
  } catch (err) {
    return next(err);
  }
});

/** Every vendor candidate evaluated during the calculate phase, for auditing the allocation decision - see BuybackVendorCalculationLog in types/domain.ts. */
buybackRouter.get('/:id/vendor-calculations', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    const logs = await buybackVendorCalculationLogRepository.listByBuybackRequest(request.id);
    return res.json(logs);
  } catch (err) {
    return next(err);
  }
});

/** Every requestStatusId transition this request has gone through - see BuybackStatusHistory in types/domain.ts. */
buybackRouter.get('/:id/status-history', async (req: AuthedRequest, res, next) => {
  try {
    const request = await loadOwnedBuyback(req.params.id, req.auth!.userId);
    const history = await buybackStatusHistoryRepository.listByBuybackRequest(request.id);
    return res.json(history);
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
