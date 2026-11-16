import { getSql } from '../../db/postgres';
import {
  AiAssessmentResult,
  BuybackRequest,
  BuybackStatus,
  Category,
  CustomerInfo,
  DiagnosisState,
  QuestionnaireAnswer,
} from '../../types/domain';
import { BuybackRepository } from '../interfaces';
import {
  SqlRow,
  insertRow,
  notFound,
  nowIso,
  toIso,
  toIsoOrUndefined,
  toNum,
  toNumOrUndefined,
  toStrOrUndefined,
  updateRowById,
} from './helpers';

type MediaKind = 'assessment_image' | 'assessment_video' | 'document_proof' | 'product_image' | 'receipt';

function mapDiagnosis(row: SqlRow): DiagnosisState | undefined {
  if (!row.diagnosis_id) return undefined;
  return {
    diagnosisId: String(row.diagnosis_id),
    qrToken: String(row.diagnosis_qr_token ?? ''),
    status: (row.diagnosis_status as DiagnosisState['status']) ?? 'not_started',
    pollCount: toNum(row.diagnosis_poll_count ?? 0),
    requiredPolls: toNum(row.diagnosis_required_polls ?? 0),
    resultAdjustmentPercent: toNumOrUndefined(row.diagnosis_result_adjustment_percent),
    findings: Array.isArray(row.diagnosis_findings)
      ? (row.diagnosis_findings as string[])
      : undefined,
    completedAt: toIsoOrUndefined(row.diagnosis_completed_at),
  };
}

function mapCustomer(row: SqlRow): CustomerInfo | undefined {
  if (!row.customer_name && !row.customer_mobile && !row.customer_email) return undefined;
  return {
    name: String(row.customer_name ?? ''),
    email: String(row.customer_email ?? ''),
    mobile: String(row.customer_mobile ?? ''),
  };
}

function mapAiAssessment(row: SqlRow, answers: QuestionnaireAnswer[]): AiAssessmentResult | undefined {
  if (!row.ai_assessment_method) return undefined;
  return {
    method: row.ai_assessment_method as 'image' | 'video',
    mediaCount: toNum(row.ai_assessment_media_count ?? 0),
    generatedAnswers: answers,
    summary: String(row.ai_assessment_summary ?? ''),
    confidence: toNum(row.ai_assessment_confidence ?? 0),
  };
}

function toMainRow(request: BuybackRequest): SqlRow {
  const diagnosis = request.diagnosis;
  const ai = request.aiAssessment;
  return {
    id: request.id,
    reference_id: request.referenceId,
    user_id: request.userId,
    status: request.status,
    request_status_id: request.requestStatusId,
    partner_location_id: request.partnerLocationId,
    category_id: request.category?.id,
    brand_id: request.brand?.id,
    product_id: request.product?.id,
    sku_id: request.sku?.id,
    identifier_type: request.identifier?.type,
    identifier_value: request.identifier?.value,
    assessment_method: request.assessmentMethod,
    max_value: request.maxValue,
    allocated_vendor_id: request.allocatedVendorId,
    retailer_value: request.retailerValue,
    customer_value: request.customerValue,
    vendor_payable: request.vendorPayable,
    with_diagnosis: request.withDiagnosis,
    final_value: request.finalValue,
    diagnosis_id: diagnosis?.diagnosisId,
    diagnosis_qr_token: diagnosis?.qrToken,
    diagnosis_status: diagnosis?.status,
    diagnosis_poll_count: diagnosis?.pollCount,
    diagnosis_required_polls: diagnosis?.requiredPolls,
    diagnosis_result_adjustment_percent: diagnosis?.resultAdjustmentPercent,
    diagnosis_findings: diagnosis?.findings,
    diagnosis_completed_at: diagnosis?.completedAt,
    customer_name: request.customer?.name,
    customer_email: request.customer?.email,
    customer_mobile: request.customer?.mobile,
    customer_otp_request_id: request.customerOtp?.requestId,
    customer_otp_verified: request.customerOtp?.verified,
    ai_assessment_method: ai?.method,
    ai_assessment_media_count: ai?.mediaCount,
    ai_assessment_summary: ai?.summary,
    ai_assessment_confidence: ai?.confidence,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
    completed_at: request.completedAt,
  };
}

function fromJoinedRow(
  row: SqlRow,
  answers: QuestionnaireAnswer[],
  media: { kind: MediaKind; url: string; sortOrder: number }[],
): BuybackRequest {
  const assessmentImages = media
    .filter((m) => m.kind === 'assessment_image')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => m.url);
  const productImages = media
    .filter((m) => m.kind === 'product_image')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => m.url);
  const assessmentVideo = media.find((m) => m.kind === 'assessment_video')?.url;
  const documentProof = media.find((m) => m.kind === 'document_proof')?.url;
  const receipt = media.find((m) => m.kind === 'receipt')?.url;

  const request: BuybackRequest = {
    id: toNum(row.id),
    referenceId: toStrOrUndefined(row.reference_id),
    userId: toNum(row.user_id),
    status: row.status as BuybackStatus,
    requestStatusId: toNumOrUndefined(row.request_status_id),
    partnerLocationId: toNumOrUndefined(row.partner_location_id),
    identifier:
      row.identifier_type && row.identifier_value
        ? {
            type: row.identifier_type as 'imei' | 'serial',
            value: String(row.identifier_value),
          }
        : undefined,
    assessmentMethod: toStrOrUndefined(row.assessment_method) as BuybackRequest['assessmentMethod'],
    questionnaireAnswers: answers.length > 0 ? answers : undefined,
    maxValue: toNumOrUndefined(row.max_value),
    allocatedVendorId: toNumOrUndefined(row.allocated_vendor_id),
    retailerValue: toNumOrUndefined(row.retailer_value),
    customerValue: toNumOrUndefined(row.customer_value),
    vendorPayable: toNumOrUndefined(row.vendor_payable),
    withDiagnosis: row.with_diagnosis === null || row.with_diagnosis === undefined ? undefined : Boolean(row.with_diagnosis),
    diagnosis: mapDiagnosis(row),
    finalValue: toNumOrUndefined(row.final_value),
    customer: mapCustomer(row),
    customerOtp: row.customer_otp_request_id
      ? {
          requestId: String(row.customer_otp_request_id),
          verified: Boolean(row.customer_otp_verified),
        }
      : undefined,
    assessmentImageUrls: assessmentImages.length > 0 ? assessmentImages : undefined,
    assessmentVideoUrl: assessmentVideo,
    documentProofUrl: documentProof,
    productImageUrls: productImages.length > 0 ? productImages : undefined,
    receiptUrl: receipt,
    aiAssessment: mapAiAssessment(row, answers),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    completedAt: toIsoOrUndefined(row.completed_at),
  };

  if (row.category_id && row.category_name) {
    request.category = {
      id: toNum(row.category_id),
      name: String(row.category_name),
      type: row.category_type as Category['type'],
      createdAt: toIso(row.category_created_at),
      updatedAt: toIso(row.category_updated_at),
      isActive: Boolean(row.category_is_active),
    };
  }
  if (row.brand_id && row.brand_name) {
    request.brand = {
      id: toNum(row.brand_id),
      name: String(row.brand_name),
      createdAt: toIso(row.brand_created_at),
      updatedAt: toIso(row.brand_updated_at),
      isActive: Boolean(row.brand_is_active),
    };
  }
  if (row.product_id && row.product_name) {
    request.product = {
      id: toNum(row.product_id),
      categoryId: toNum(row.product_category_id),
      brandId: toNum(row.product_brand_id),
      name: String(row.product_name),
      createdAt: toIso(row.product_created_at),
      updatedAt: toIso(row.product_updated_at),
      isActive: Boolean(row.product_is_active),
    };
  }
  if (row.sku_id && row.sku_code) {
    request.sku = {
      id: toNum(row.sku_id),
      productId: toNum(row.sku_product_id),
      code: String(row.sku_code),
      label: String(row.sku_label),
      createdAt: toIso(row.sku_created_at),
      updatedAt: toIso(row.sku_updated_at),
      isActive: Boolean(row.sku_is_active),
    };
  }

  return request;
}

async function loadAnswers(buybackId: number): Promise<QuestionnaireAnswer[]> {
  const sql = getSql();
  const rows = await sql<{ question_id: string | number; question_answer_id: string | number }[]>`
    SELECT question_id, question_answer_id
    FROM buyback_questionnaire_answers
    WHERE buyback_request_id = ${buybackId}
    ORDER BY id
  `;
  const byQuestion = new Map<number, number[]>();
  for (const row of rows) {
    const qid = Number(row.question_id);
    const list = byQuestion.get(qid) ?? [];
    list.push(Number(row.question_answer_id));
    byQuestion.set(qid, list);
  }
  return [...byQuestion.entries()].map(([questionId, questionAnswerIds]) => ({
    questionId,
    questionAnswerIds,
  }));
}

async function loadMedia(
  buybackId: number,
): Promise<{ kind: MediaKind; url: string; sortOrder: number }[]> {
  const sql = getSql();
  const rows = await sql<{ media_kind: MediaKind; url: string; sort_order: string | number }[]>`
    SELECT media_kind, url, sort_order
    FROM buyback_media
    WHERE buyback_request_id = ${buybackId}
    ORDER BY sort_order, id
  `;
  return rows.map((r) => ({
    kind: r.media_kind,
    url: r.url,
    sortOrder: Number(r.sort_order),
  }));
}

async function replaceAnswers(buybackId: number, answers: QuestionnaireAnswer[] | undefined): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM buyback_questionnaire_answers WHERE buyback_request_id = ${buybackId}`;
  if (!answers?.length) return;
  for (const answer of answers) {
    for (const questionAnswerId of answer.questionAnswerIds) {
      await sql`
        INSERT INTO buyback_questionnaire_answers (buyback_request_id, question_id, question_answer_id)
        VALUES (${buybackId}, ${answer.questionId}, ${questionAnswerId})
      `;
    }
  }
}

async function replaceMediaKind(
  buybackId: number,
  kind: MediaKind,
  urls: string[] | undefined,
): Promise<void> {
  const sql = getSql();
  await sql`
    DELETE FROM buyback_media
    WHERE buyback_request_id = ${buybackId} AND media_kind = ${kind}
  `;
  if (!urls?.length) return;
  for (let i = 0; i < urls.length; i += 1) {
    await sql`
      INSERT INTO buyback_media (buyback_request_id, media_kind, url, sort_order)
      VALUES (${buybackId}, ${kind}, ${urls[i]}, ${i})
    `;
  }
}

async function hydrate(row: SqlRow): Promise<BuybackRequest> {
  const id = toNum(row.id);
  const [answers, media] = await Promise.all([loadAnswers(id), loadMedia(id)]);
  return fromJoinedRow(row, answers, media);
}

export class PostgresBuybackRepository implements BuybackRepository {
  async create(request: BuybackRequest): Promise<BuybackRequest> {
    await insertRow('buyback_requests', toMainRow(request));
    await replaceAnswers(request.id, request.questionnaireAnswers ?? request.aiAssessment?.generatedAnswers);
    await replaceMediaKind(request.id, 'assessment_image', request.assessmentImageUrls);
    await replaceMediaKind(
      request.id,
      'assessment_video',
      request.assessmentVideoUrl ? [request.assessmentVideoUrl] : undefined,
    );
    await replaceMediaKind(
      request.id,
      'document_proof',
      request.documentProofUrl ? [request.documentProofUrl] : undefined,
    );
    await replaceMediaKind(request.id, 'product_image', request.productImageUrls);
    await replaceMediaKind(request.id, 'receipt', request.receiptUrl ? [request.receiptUrl] : undefined);
    return (await this.findById(request.id)) ?? request;
  }

  async findById(id: number): Promise<BuybackRequest | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT
        b.*,
        c.name AS category_name, c.type AS category_type,
        c.created_at AS category_created_at, c.updated_at AS category_updated_at, c.is_active AS category_is_active,
        br.name AS brand_name,
        br.created_at AS brand_created_at, br.updated_at AS brand_updated_at, br.is_active AS brand_is_active,
        p.name AS product_name, p.category_id AS product_category_id, p.brand_id AS product_brand_id,
        p.created_at AS product_created_at, p.updated_at AS product_updated_at, p.is_active AS product_is_active,
        s.code AS sku_code, s.label AS sku_label, s.product_id AS sku_product_id,
        s.created_at AS sku_created_at, s.updated_at AS sku_updated_at, s.is_active AS sku_is_active
      FROM buyback_requests b
      LEFT JOIN categories c ON c.id = b.category_id
      LEFT JOIN brands br ON br.id = b.brand_id
      LEFT JOIN products p ON p.id = b.product_id
      LEFT JOIN skus s ON s.id = b.sku_id
      WHERE b.id = ${id}
    `;
    if (!rows[0]) return undefined;
    return hydrate(rows[0]);
  }

  async update(id: number, patch: Partial<BuybackRequest>): Promise<BuybackRequest> {
    const existing = await this.findById(id);
    if (!existing) throw notFound('Buyback request', id);

    const updated: BuybackRequest = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: nowIso(),
      // Nested objects: prefer patch when provided
      category: patch.category !== undefined ? patch.category : existing.category,
      brand: patch.brand !== undefined ? patch.brand : existing.brand,
      product: patch.product !== undefined ? patch.product : existing.product,
      sku: patch.sku !== undefined ? patch.sku : existing.sku,
      identifier: patch.identifier !== undefined ? patch.identifier : existing.identifier,
      diagnosis: patch.diagnosis !== undefined ? patch.diagnosis : existing.diagnosis,
      customer: patch.customer !== undefined ? patch.customer : existing.customer,
      customerOtp: patch.customerOtp !== undefined ? patch.customerOtp : existing.customerOtp,
      aiAssessment: patch.aiAssessment !== undefined ? patch.aiAssessment : existing.aiAssessment,
      questionnaireAnswers:
        patch.questionnaireAnswers !== undefined
          ? patch.questionnaireAnswers
          : existing.questionnaireAnswers,
      assessmentImageUrls:
        patch.assessmentImageUrls !== undefined ? patch.assessmentImageUrls : existing.assessmentImageUrls,
      assessmentVideoUrl:
        patch.assessmentVideoUrl !== undefined ? patch.assessmentVideoUrl : existing.assessmentVideoUrl,
      documentProofUrl:
        patch.documentProofUrl !== undefined ? patch.documentProofUrl : existing.documentProofUrl,
      productImageUrls:
        patch.productImageUrls !== undefined ? patch.productImageUrls : existing.productImageUrls,
      receiptUrl: patch.receiptUrl !== undefined ? patch.receiptUrl : existing.receiptUrl,
    };

    const row = await updateRowById('buyback_requests', id, toMainRow(updated));
    if (!row) throw notFound('Buyback request', id);

    if (patch.questionnaireAnswers !== undefined || patch.aiAssessment !== undefined) {
      await replaceAnswers(
        id,
        updated.questionnaireAnswers ?? updated.aiAssessment?.generatedAnswers,
      );
    }
    if (patch.assessmentImageUrls !== undefined) {
      await replaceMediaKind(id, 'assessment_image', updated.assessmentImageUrls);
    }
    if (patch.assessmentVideoUrl !== undefined) {
      await replaceMediaKind(
        id,
        'assessment_video',
        updated.assessmentVideoUrl ? [updated.assessmentVideoUrl] : undefined,
      );
    }
    if (patch.documentProofUrl !== undefined) {
      await replaceMediaKind(
        id,
        'document_proof',
        updated.documentProofUrl ? [updated.documentProofUrl] : undefined,
      );
    }
    if (patch.productImageUrls !== undefined) {
      await replaceMediaKind(id, 'product_image', updated.productImageUrls);
    }
    if (patch.receiptUrl !== undefined) {
      await replaceMediaKind(id, 'receipt', updated.receiptUrl ? [updated.receiptUrl] : undefined);
    }

    return (await this.findById(id))!;
  }

  async listByUser(userId: number): Promise<BuybackRequest[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT
        b.*,
        c.name AS category_name, c.type AS category_type,
        c.created_at AS category_created_at, c.updated_at AS category_updated_at, c.is_active AS category_is_active,
        br.name AS brand_name,
        br.created_at AS brand_created_at, br.updated_at AS brand_updated_at, br.is_active AS brand_is_active,
        p.name AS product_name, p.category_id AS product_category_id, p.brand_id AS product_brand_id,
        p.created_at AS product_created_at, p.updated_at AS product_updated_at, p.is_active AS product_is_active,
        s.code AS sku_code, s.label AS sku_label, s.product_id AS sku_product_id,
        s.created_at AS sku_created_at, s.updated_at AS sku_updated_at, s.is_active AS sku_is_active
      FROM buyback_requests b
      LEFT JOIN categories c ON c.id = b.category_id
      LEFT JOIN brands br ON br.id = b.brand_id
      LEFT JOIN products p ON p.id = b.product_id
      LEFT JOIN skus s ON s.id = b.sku_id
      WHERE b.user_id = ${userId}
      ORDER BY b.created_at DESC
    `;
    const result: BuybackRequest[] = [];
    for (const row of rows) {
      result.push(await hydrate(row));
    }
    return result;
  }

  async nextDailySequence(dateKey: string): Promise<number> {
    const sql = getSql();
    const rows = await sql<{ last_value: string | number }[]>`
      INSERT INTO buyback_daily_sequences (date_key, last_value)
      VALUES (${dateKey}, 1)
      ON CONFLICT (date_key) DO UPDATE
        SET last_value = buyback_daily_sequences.last_value + 1
      RETURNING last_value
    `;
    return Number(rows[0].last_value);
  }
}
