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

type Doc = { id: number };

async function upsertDocs(table: string, rows: Doc[]): Promise<void> {
  const sql = getMigrateSql();
  for (const row of rows) {
    await sql`
      INSERT INTO ${sql(table)} (id, data)
      VALUES (${row.id}, ${sql.json(row as never)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  }
}

async function setSequence(tableName: string, lastValue: number): Promise<void> {
  const sql = getMigrateSql();
  await sql`
    INSERT INTO id_sequences (table_name, last_value)
    VALUES (${tableName}, ${lastValue})
    ON CONFLICT (table_name) DO UPDATE SET last_value = GREATEST(id_sequences.last_value, EXCLUDED.last_value)
  `;
}

function maxId(rows: Doc[]): number {
  return rows.reduce((max, row) => (row.id > max ? row.id : max), 0);
}

async function seed(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Seeding Postgres from src/data/*.seed.ts …');

  await upsertDocs('categories', categories);
  await upsertDocs('brands', brands);
  await upsertDocs('products', products);
  await upsertDocs('skus', skus);
  await upsertDocs('sku_aliases', skuAliases);

  await upsertDocs('partners', partners);
  await upsertDocs('partner_locations', partnerLocations);
  await upsertDocs('roles', roles);

  await upsertDocs('users', users);
  await upsertDocs('user_roles', userRoles);

  await upsertDocs('master_questions', masterQuestions);
  await upsertDocs('question_translations', questionTranslations);
  await upsertDocs('master_answers', masterAnswers);
  await upsertDocs('answer_translations', answerTranslations);
  await upsertDocs('question_answer_mappings', questionAnswerMappings);
  await upsertDocs('questionnaire_configs', questionnaireConfigs);

  await upsertDocs('partner_category_vendor_mappings', partnerCategoryVendorMappings);
  await upsertDocs('sku_pricing', skuPricing);

  await upsertDocs('depreciation_configs', depreciationConfigs);
  await upsertDocs('depreciation_matrix', depreciationMatrix);

  await upsertDocs('request_status_master', requestStatuses);

  await upsertDocs('partner_margin_configs', partnerMarginConfigs);
  await upsertDocs('vendor_fee_configs', vendorFeeConfigs);

  // Align id_sequences with seed max IDs (same effect as reserveIdRange in in-memory).
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
  console.log(`Seed complete: ${sequenceTargets.length} sequence counters updated.`);
  await closeSql();
}

seed().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  await closeSql().catch(() => undefined);
  process.exit(1);
});
