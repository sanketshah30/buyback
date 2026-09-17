import { env } from '../config/env';
import { partnerCategoryVendorMappingRepository, skuPricingRepository } from '../repositories';
import { Question, QuestionnaireAnswer } from '../types/domain';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface VendorPriceCandidate {
  vendorId: number;
  price: number;
}

/**
 * Resolves the base device price to run through `computeMaxValue()` below,
 * now that the catalog itself carries no price at all (see the
 * `Product`/`Sku` doc comments in types/domain.ts) - pricing comes entirely
 * from the vendor pricing module: every vendor mapped to this retail
 * partner + category (`partner_category_vendor_mapping`) that has an
 * active, currently-valid price for this SKU (`sku_pricing`) is a
 * candidate.
 *
 * **Placeholder vendor-selection algorithm**: picks the highest currently
 * valid candidate price (the best deal for the customer). This is
 * intentionally simple - the real "calculate multiple buyback values and
 * finalize a vendor based on our algorithm" engine is a follow-up phase
 * (see server/README.md "Vendor pricing module"); this just keeps the
 * existing buyback flow functional in the meantime.
 */
export async function resolveBestVendorPrice(
  partnerId: number,
  productCategoryId: number,
  skuId: number,
  asOf: Date = new Date(),
): Promise<VendorPriceCandidate | undefined> {
  const mappings = await partnerCategoryVendorMappingRepository.listVendorsFor(partnerId, productCategoryId);

  const candidates: VendorPriceCandidate[] = [];
  for (const mapping of mappings) {
    const rows = await skuPricingRepository.listForVendorSku(mapping.vendorId, skuId);
    const validRow = rows.find((row) => {
      const from = new Date(row.validFrom).getTime();
      const to = row.validTo ? new Date(row.validTo).getTime() : undefined;
      return from <= asOf.getTime() && (to === undefined || asOf.getTime() < to);
    });
    if (validRow) candidates.push({ vendorId: mapping.vendorId, price: validRow.price });
  }

  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => b.price - a.price);
  return candidates[0];
}

/**
 * Applies the questionnaire's configured `valueImpactPercent` deductions/bonuses
 * on top of a base device price to compute the estimated max value.
 */
export function computeMaxValue(
  basePrice: number,
  questions: Question[],
  answers: QuestionnaireAnswer[],
): number {
  let totalImpactPercent = 0;

  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) continue;
    for (const optionId of answer.optionIds) {
      const option = question.options.find((o) => o.id === optionId);
      if (option) {
        totalImpactPercent += option.valueImpactPercent;
      }
    }
  }

  const clampedImpact = clamp(totalImpactPercent, -20, 100); // bonuses capped, deductions capped at 100%
  const value = basePrice * (1 - clampedImpact / 100);
  return Math.max(0, Math.round(value));
}

/** 35%-style drop applied when the customer skips the optional diagnosis step. */
export function applyNoDiagnosisDrop(maxValue: number): number {
  const drop = env.noDiagnosisValueDropPercent / 100;
  return Math.max(0, Math.round(maxValue * (1 - drop)));
}

/** Recalculates the final value once the (mock) diagnosis result is in. */
export function applyDiagnosisAdjustment(maxValue: number, adjustmentPercent: number): number {
  return Math.max(0, Math.round(maxValue * (1 - adjustmentPercent / 100)));
}
