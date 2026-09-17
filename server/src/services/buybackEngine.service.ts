import { REQUEST_STATUS_AMOUNT_CALCULATED_ID, REQUEST_STATUS_CREATED_ID } from '../data/requestStatus.seed';
import {
  buybackRepository,
  buybackStatusHistoryRepository,
  buybackVendorCalculationLogRepository,
  partnerCategoryVendorMappingRepository,
  partnerMarginConfigRepository,
  skuPricingRepository,
  vendorFeeConfigRepository,
} from '../repositories';
import { BuybackRequest, BuybackVendorCalculationLog, PartnerLocation, QuestionnaireAnswer } from '../types/domain';
import { dateKey, formatBuybackReferenceId } from '../utils/id';
import { nextId } from '../utils/idGenerator';
import { depreciationService } from './depreciation.service';

/**
 * Buyback request creation engine: register -> calculate -> allocate.
 * All three phases run in sequence from `POST /api/buyback/:id/valuation`
 * (see routes/buyback.routes.ts) - they're split into separate functions
 * here, not separate HTTP endpoints, since that's the single trigger point
 * the live flow calls today.
 */

async function recordStatus(buybackRequestId: number, requestStatusId: number, changedByUserId: number): Promise<void> {
  const now = new Date().toISOString();
  await buybackStatusHistoryRepository.record({
    id: nextId('buyback_status_history'),
    buybackRequestId,
    requestStatusId,
    changedByUserId,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  });
}

/**
 * Phase 1: register. Generates the reference ID and maps the request to
 * the registering promoter's partner location - the request's status
 * becomes "Request Created" the moment this runs.
 */
export async function register(request: BuybackRequest, partnerLocationId: number, changedByUserId: number): Promise<BuybackRequest> {
  const sequence = await buybackRepository.nextDailySequence(dateKey());
  const referenceId = formatBuybackReferenceId(sequence);

  const updated = await buybackRepository.update(request.id, {
    referenceId,
    partnerLocationId,
    requestStatusId: REQUEST_STATUS_CREATED_ID,
  });
  await recordStatus(request.id, REQUEST_STATUS_CREATED_ID, changedByUserId);
  return updated;
}

/**
 * Phase 2: calculate. For every vendor mapped to (partnerLocationId,
 * category) via `partner_category_vendor_mapping`:
 *   buybackValue = skuPrice - totalDepreciationAmount
 * where `totalDepreciationAmount` sums every `depreciation_matrix`
 * deduction whose `questionAnswerId` was actually answered on this
 * request - percentage-type entries convert to an amount off `skuPrice`,
 * absolute-type entries are taken directly, and both kinds sum together
 * (a request can mix both across different question-answers). Every
 * evaluated vendor is logged, not just the eventual winner, so the
 * allocation decision stays fully auditable.
 */
export async function calculate(
  request: BuybackRequest,
  partnerLocationId: number,
  answers: QuestionnaireAnswer[],
  asOf: Date = new Date(),
): Promise<BuybackVendorCalculationLog[]> {
  if (!request.category || !request.brand || !request.sku) {
    throw Object.assign(new Error('Category, brand, and SKU must be selected before calculating a buyback value'), { status: 400 });
  }

  const answeredQuestionAnswerIds = new Set(answers.flatMap((a) => a.questionAnswerIds));

  const vendorMappings = await partnerCategoryVendorMappingRepository.listVendorsFor(partnerLocationId, request.category.id);
  if (vendorMappings.length === 0) {
    throw Object.assign(new Error('No vendor is configured for your location and this device category yet.'), { status: 422 });
  }

  const now = new Date().toISOString();
  const logs: BuybackVendorCalculationLog[] = [];

  for (const mapping of vendorMappings) {
    const priceRows = await skuPricingRepository.listForVendorSku(mapping.vendorId, request.sku.id);
    const validPriceRow = priceRows.find((row) => {
      const from = new Date(row.validFrom).getTime();
      const to = row.validTo ? new Date(row.validTo).getTime() : undefined;
      return from <= asOf.getTime() && (to === undefined || asOf.getTime() < to);
    });
    if (!validPriceRow) continue; // this vendor hasn't priced this SKU - not a viable candidate

    // Vendor-exact depreciation set, falling back to the wildcard
    // (vendorId: null) set - see depreciationService.resolve().
    const resolved = await depreciationService.resolve(request.category.id, request.brand.id, mapping.vendorId, asOf);

    let totalDepreciationAmount = 0;
    for (const entry of resolved?.matrix ?? []) {
      if (!answeredQuestionAnswerIds.has(entry.questionAnswerId)) continue;
      totalDepreciationAmount +=
        entry.depreciationType === 'percentage' ? (validPriceRow.price * entry.depreciationValue) / 100 : entry.depreciationValue;
    }

    const buybackValue = Math.max(0, Math.round(validPriceRow.price - totalDepreciationAmount));

    const log: BuybackVendorCalculationLog = {
      id: nextId('buyback_vendor_calculation_log'),
      buybackRequestId: request.id,
      vendorId: mapping.vendorId,
      skuPricingId: validPriceRow.id,
      depreciationConfigId: resolved?.config.id ?? null,
      skuPrice: validPriceRow.price,
      totalDepreciationAmount: Math.round(totalDepreciationAmount),
      buybackValue,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await buybackVendorCalculationLogRepository.record(log);
    logs.push(log);
  }

  if (logs.length === 0) {
    throw Object.assign(new Error('No vendor mapped to your location has an active price for this SKU yet.'), { status: 422 });
  }

  return logs;
}

/**
 * Phase 3: allocate. Picks the candidate with the highest `buybackValue`
 * ("Retailer" value - ties broken by the lowest `vendorId`) and derives
 * the other two values the parent request needs to capture:
 *
 *   Retailer value = winner.buybackValue (SKU pricing - total depreciation, already computed by calculate())
 *   Customer value = Retailer value - (Retailer value * partner margin %)
 *   Vendor payable = Retailer value + vendor fee
 *
 * Partner margin is resolved for the registering promoter's own
 * (partnerId, partnerLocationId, category) - exact location match, falling
 * back to the partnerLocationId=0 "all locations" wildcard - and defaults
 * to 0% if none is configured. Vendor fee is resolved for
 * (winner.vendorId, category) and defaults to 0 if unconfigured - **only
 * ever for the allocated vendor**, never every candidate.
 *
 * `maxValue` is set equal to `customerValue` - the rest of the flow
 * (diagnosis adjustment, `finalValue`, every customer-facing screen)
 * already reads `maxValue`, and what a customer actually receives is the
 * Customer value, not the Retailer value.
 */
export async function allocate(
  request: BuybackRequest,
  candidates: BuybackVendorCalculationLog[],
  location: PartnerLocation,
  changedByUserId: number,
): Promise<BuybackRequest> {
  if (!request.category) {
    throw Object.assign(new Error('Category must be selected before allocation'), { status: 400 });
  }
  const winner = [...candidates].sort((a, b) => b.buybackValue - a.buybackValue || a.vendorId - b.vendorId)[0];
  const retailerValue = winner.buybackValue;

  const marginConfig = await partnerMarginConfigRepository.resolve(location.partnerId, location.id, request.category.id);
  const marginPercent = marginConfig?.marginPercent ?? 0;
  const customerValue = Math.max(0, Math.round(retailerValue - (retailerValue * marginPercent) / 100));

  const feeConfig = await vendorFeeConfigRepository.resolve(winner.vendorId, request.category.id);
  const vendorPayable = Math.max(0, Math.round(retailerValue + (feeConfig?.feeAmount ?? 0)));

  const updated = await buybackRepository.update(request.id, {
    maxValue: customerValue,
    allocatedVendorId: winner.vendorId,
    retailerValue,
    customerValue,
    vendorPayable,
    requestStatusId: REQUEST_STATUS_AMOUNT_CALCULATED_ID,
    status: 'valuation_ready',
  });
  await recordStatus(request.id, REQUEST_STATUS_AMOUNT_CALCULATED_ID, changedByUserId);
  return updated;
}
