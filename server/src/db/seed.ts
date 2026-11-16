import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { brands, categories, products, skuAliases, skus } from '../data/catalog.seed';
import { depreciationConfigs, depreciationMatrix } from '../data/depreciation.seed';
import { partnerLocations, partners, roles } from '../data/partner.seed';
import { partnerMarginConfigs, vendorFeeConfigs } from '../data/partnerFinancials.seed';
import {
  answerTranslations,
  masterAnswers,
  masterQuestions,
  questionAnswerMappings,
  questionTranslations,
  questionnaireConfigs,
} from '../data/questionnaireConfig.seed';
import { requestStatuses } from '../data/requestStatus.seed';
import { userRoles, users } from '../data/user.seed';
import { partnerCategoryVendorMappings, skuPricing } from '../data/vendorPricing.seed';
import { closeSql, getMigrateSql } from './postgres';

type Row = Record<string, unknown>;

function prepare(row: Row): Row {
  const sql = getMigrateSql();
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) out[key] = null;
    else if (Array.isArray(value)) out[key] = sql.array(value as string[]);
    else out[key] = value;
  }
  return out;
}

async function insert(table: string, row: Row): Promise<void> {
  const sql = getMigrateSql();
  await sql`INSERT INTO ${sql(table)} ${sql(prepare(row) as never)}`;
}

async function setSequence(tableName: string, lastValue: number): Promise<void> {
  const sql = getMigrateSql();
  await sql`
    INSERT INTO id_sequences (table_name, last_value)
    VALUES (${tableName}, ${lastValue})
    ON CONFLICT (table_name) DO UPDATE
      SET last_value = GREATEST(id_sequences.last_value, EXCLUDED.last_value)
  `;
}

function maxId(rows: { id: number }[]): number {
  return rows.reduce((max, row) => (row.id > max ? row.id : max), 0);
}

function audit(entity: { createdAt: string; updatedAt: string; isActive: boolean }) {
  return {
    created_at: entity.createdAt,
    updated_at: entity.updatedAt,
    is_active: entity.isActive,
  };
}

async function seed(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Seeding relational Postgres from src/data/*.seed.ts …');

  for (const row of categories) {
    await insert('categories', { id: row.id, name: row.name, type: row.type, ...audit(row) });
  }
  for (const row of brands) {
    await insert('brands', { id: row.id, name: row.name, ...audit(row) });
  }
  for (const row of products) {
    await insert('products', {
      id: row.id,
      category_id: row.categoryId,
      brand_id: row.brandId,
      name: row.name,
      ...audit(row),
    });
  }
  for (const row of skus) {
    await insert('skus', {
      id: row.id,
      product_id: row.productId,
      code: row.code,
      label: row.label,
      ...audit(row),
    });
  }
  for (const row of skuAliases) {
    await insert('sku_aliases', {
      id: row.id,
      sku_id: row.skuId,
      partner_id: row.partnerId,
      partner_sku_name: row.partnerSkuName,
      ...audit(row),
    });
  }

  for (const row of partners) {
    await insert('partners', {
      id: row.id,
      name: row.name,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zipCode,
      country: row.country,
      partner_type: row.partnerType,
      unique_identifier: row.uniqueIdentifier,
      email: row.email,
      ...audit(row),
    });
  }
  for (const row of partnerLocations) {
    await insert('partner_locations', {
      id: row.id,
      partner_id: row.partnerId,
      name: row.name,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zipCode,
      country: row.country,
      unique_identifier: row.uniqueIdentifier,
      email: row.email,
      ...audit(row),
    });
  }
  for (const row of roles) {
    await insert('roles', {
      id: row.id,
      name: row.name,
      rights: row.rights,
      ...audit(row),
    });
  }
  for (const row of users) {
    await insert('users', {
      id: row.id,
      mobile: row.mobile,
      name: row.name,
      username: row.username,
      email: row.email,
      partner_location_id: row.partnerLocationId,
      ...audit(row),
    });
  }
  for (const row of userRoles) {
    await insert('user_roles', {
      id: row.id,
      user_id: row.userId,
      role_id: row.roleId,
      ...audit(row),
    });
  }

  for (const row of masterQuestions) {
    await insert('questions', { id: row.id, type: row.type, ...audit(row) });
  }
  for (const row of questionTranslations) {
    await insert('question_translations', {
      id: row.id,
      question_id: row.questionId,
      language: row.language,
      text: row.text,
      ...audit(row),
    });
  }
  for (const row of masterAnswers) {
    await insert('answers', { id: row.id, code: row.code, ...audit(row) });
  }
  for (const row of answerTranslations) {
    await insert('answer_translations', {
      id: row.id,
      answer_id: row.answerId,
      language: row.language,
      text: row.text,
      ...audit(row),
    });
  }
  for (const row of questionAnswerMappings) {
    await insert('question_answer_mapping', {
      id: row.id,
      question_id: row.questionId,
      answer_id: row.answerId,
      ...audit(row),
    });
  }
  for (const row of questionnaireConfigs) {
    await insert('questionnaire_config', {
      id: row.id,
      product_category_id: row.productCategoryId,
      brand_id: row.brandId,
      partner_id: row.partnerId,
      question_answer_id: row.questionAnswerId,
      sequence: row.sequence,
      ...audit(row),
    });
  }

  for (const row of partnerCategoryVendorMappings) {
    await insert('partner_category_vendor_mapping', {
      id: row.id,
      partner_location_id: row.partnerLocationId,
      product_category_id: row.productCategoryId,
      vendor_id: row.vendorId,
      ...audit(row),
    });
  }
  for (const row of skuPricing) {
    await insert('sku_pricing', {
      id: row.id,
      vendor_id: row.vendorId,
      sku_id: row.skuId,
      price: row.price,
      valid_from: row.validFrom,
      valid_to: row.validTo,
      uploaded_by_id: row.uploadedById,
      ...audit(row),
    });
  }

  for (const row of depreciationConfigs) {
    await insert('depreciation_config', {
      id: row.id,
      product_category_id: row.productCategoryId,
      brand_id: row.brandId,
      vendor_id: row.vendorId,
      valid_from: row.validFrom,
      valid_to: row.validTo,
      uploaded_by_id: row.uploadedById,
      ...audit(row),
    });
  }
  for (const row of depreciationMatrix) {
    await insert('depreciation_matrix', {
      id: row.id,
      depreciation_config_id: row.depreciationConfigId,
      question_answer_id: row.questionAnswerId,
      depreciation_type: row.depreciationType,
      depreciation_value: row.depreciationValue,
      ...audit(row),
    });
  }

  for (const row of requestStatuses) {
    await insert('request_status_master', {
      id: row.id,
      name: row.name,
      sequence: row.sequence,
      ...audit(row),
    });
  }

  for (const row of partnerMarginConfigs) {
    await insert('partner_margin_config', {
      id: row.id,
      partner_id: row.partnerId,
      partner_location_id: row.partnerLocationId,
      product_category_id: row.productCategoryId,
      margin_percent: row.marginPercent,
      ...audit(row),
    });
  }
  for (const row of vendorFeeConfigs) {
    await insert('vendor_fee_config', {
      id: row.id,
      vendor_id: row.vendorId,
      product_category_id: row.productCategoryId,
      fee_amount: row.feeAmount,
      ...audit(row),
    });
  }

  const sequenceTargets: [string, number][] = [
    ['categories', maxId(categories)],
    ['brands', maxId(brands)],
    ['products', maxId(products)],
    ['skus', maxId(skus)],
    ['sku_aliases', maxId(skuAliases)],
    ['partners', maxId(partners)],
    ['partner_locations', maxId(partnerLocations)],
    ['roles', maxId(roles)],
    ['users', maxId(users)],
    ['user_roles', maxId(userRoles)],
    ['questions', maxId(masterQuestions)],
    ['question_translations', maxId(questionTranslations)],
    ['answers', maxId(masterAnswers)],
    ['answer_translations', maxId(answerTranslations)],
    ['question_answer_mapping', maxId(questionAnswerMappings)],
    ['questionnaire_config', maxId(questionnaireConfigs)],
    ['partner_category_vendor_mapping', maxId(partnerCategoryVendorMappings)],
    ['sku_pricing', maxId(skuPricing)],
    ['depreciation_config', maxId(depreciationConfigs)],
    ['depreciation_matrix', maxId(depreciationMatrix)],
    ['request_status_master', maxId(requestStatuses)],
    ['partner_margin_config', maxId(partnerMarginConfigs)],
    ['vendor_fee_config', maxId(vendorFeeConfigs)],
  ];

  for (const [name, value] of sequenceTargets) {
    await setSequence(name, value);
  }

  // eslint-disable-next-line no-console
  console.log(`Seed complete: ${sequenceTargets.length} tables loaded, sequences aligned.`);
  await closeSql();
}

seed().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  await closeSql().catch(() => undefined);
  process.exit(1);
});
