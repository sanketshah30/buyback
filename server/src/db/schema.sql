-- Buyback platform schema: JSONB document tables (id + data).
-- Each domain entity is stored 1:1 as jsonb so nested shapes stay intact.

CREATE TABLE IF NOT EXISTS id_sequences (
  table_name text PRIMARY KEY,
  last_value bigint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS buyback_daily_sequences (
  date_key text PRIMARY KEY,
  last_value bigint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_idx ON users ((data->>'mobile'));
CREATE INDEX IF NOT EXISTS users_partner_location_idx ON users (((data->>'partnerLocationId')::bigint));
CREATE INDEX IF NOT EXISTS users_username_idx ON users ((data->>'username'));
CREATE INDEX IF NOT EXISTS users_email_idx ON users ((data->>'email'));

CREATE TABLE IF NOT EXISTS otp_challenges (
  request_id text PRIMARY KEY,
  data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_idx ON sessions ((data->>'token'));
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (((data->>'userId')::bigint));

CREATE TABLE IF NOT EXISTS categories (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS brands (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (((data->>'categoryId')::bigint));
CREATE INDEX IF NOT EXISTS products_brand_idx ON products (((data->>'brandId')::bigint));
CREATE INDEX IF NOT EXISTS products_category_brand_idx ON products (
  ((data->>'categoryId')::bigint),
  ((data->>'brandId')::bigint)
);

CREATE TABLE IF NOT EXISTS skus (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS skus_product_id_idx ON skus (((data->>'productId')::bigint));

CREATE TABLE IF NOT EXISTS sku_aliases (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS sku_aliases_sku_id_idx ON sku_aliases (((data->>'skuId')::bigint));

CREATE TABLE IF NOT EXISTS buyback_requests (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS buyback_requests_user_id_idx ON buyback_requests (((data->>'userId')::bigint));

CREATE TABLE IF NOT EXISTS partners (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS partners_unique_identifier_idx ON partners ((data->>'uniqueIdentifier'));
CREATE INDEX IF NOT EXISTS partners_type_idx ON partners ((data->>'partnerType'));

CREATE TABLE IF NOT EXISTS partner_locations (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS partner_locations_partner_id_idx ON partner_locations (((data->>'partnerId')::bigint));
CREATE INDEX IF NOT EXISTS partner_locations_unique_identifier_idx ON partner_locations ((data->>'uniqueIdentifier'));

CREATE TABLE IF NOT EXISTS roles (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles (((data->>'userId')::bigint));

CREATE TABLE IF NOT EXISTS user_location_history (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS user_location_history_user_id_idx ON user_location_history (((data->>'userId')::bigint));

CREATE TABLE IF NOT EXISTS master_questions (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS question_translations (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS question_translations_question_id_idx ON question_translations (((data->>'questionId')::bigint));

CREATE TABLE IF NOT EXISTS master_answers (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS master_answers_code_idx ON master_answers ((data->>'code'));

CREATE TABLE IF NOT EXISTS answer_translations (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS answer_translations_answer_id_idx ON answer_translations (((data->>'answerId')::bigint));

CREATE TABLE IF NOT EXISTS question_answer_mappings (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS question_answer_mappings_question_id_idx ON question_answer_mappings (((data->>'questionId')::bigint));

CREATE TABLE IF NOT EXISTS questionnaire_configs (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS questionnaire_configs_category_idx ON questionnaire_configs (((data->>'productCategoryId')::bigint));
CREATE INDEX IF NOT EXISTS questionnaire_configs_profile_idx ON questionnaire_configs (
  ((data->>'productCategoryId')::bigint),
  (data->>'brandId'),
  (data->>'partnerId')
);

CREATE TABLE IF NOT EXISTS partner_category_vendor_mappings (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS pcvm_location_idx ON partner_category_vendor_mappings (((data->>'partnerLocationId')::bigint));
CREATE INDEX IF NOT EXISTS pcvm_category_idx ON partner_category_vendor_mappings (((data->>'productCategoryId')::bigint));
CREATE INDEX IF NOT EXISTS pcvm_vendor_idx ON partner_category_vendor_mappings (((data->>'vendorId')::bigint));
CREATE INDEX IF NOT EXISTS pcvm_location_category_idx ON partner_category_vendor_mappings (
  ((data->>'partnerLocationId')::bigint),
  ((data->>'productCategoryId')::bigint)
);

CREATE TABLE IF NOT EXISTS sku_pricing (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS sku_pricing_vendor_idx ON sku_pricing (((data->>'vendorId')::bigint));
CREATE INDEX IF NOT EXISTS sku_pricing_sku_idx ON sku_pricing (((data->>'skuId')::bigint));
CREATE INDEX IF NOT EXISTS sku_pricing_vendor_sku_idx ON sku_pricing (
  ((data->>'vendorId')::bigint),
  ((data->>'skuId')::bigint)
);

CREATE TABLE IF NOT EXISTS request_status_master (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS request_status_master_name_idx ON request_status_master ((data->>'name'));

CREATE TABLE IF NOT EXISTS buyback_status_history (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS buyback_status_history_request_idx ON buyback_status_history (((data->>'buybackRequestId')::bigint));

CREATE TABLE IF NOT EXISTS buyback_vendor_calculation_log (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS buyback_vendor_calc_log_request_idx ON buyback_vendor_calculation_log (((data->>'buybackRequestId')::bigint));

CREATE TABLE IF NOT EXISTS partner_margin_configs (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS partner_margin_configs_scope_idx ON partner_margin_configs (
  ((data->>'partnerId')::bigint),
  ((data->>'partnerLocationId')::bigint),
  ((data->>'productCategoryId')::bigint)
);

CREATE TABLE IF NOT EXISTS vendor_fee_configs (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS vendor_fee_configs_scope_idx ON vendor_fee_configs (
  ((data->>'vendorId')::bigint),
  ((data->>'productCategoryId')::bigint)
);

CREATE TABLE IF NOT EXISTS depreciation_configs (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS depreciation_configs_category_idx ON depreciation_configs (((data->>'productCategoryId')::bigint));
CREATE INDEX IF NOT EXISTS depreciation_configs_brand_idx ON depreciation_configs (((data->>'brandId')::bigint));
CREATE INDEX IF NOT EXISTS depreciation_configs_profile_idx ON depreciation_configs (
  ((data->>'productCategoryId')::bigint),
  ((data->>'brandId')::bigint),
  (data->>'vendorId')
);

CREATE TABLE IF NOT EXISTS depreciation_matrix (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS depreciation_matrix_config_idx ON depreciation_matrix (((data->>'depreciationConfigId')::bigint));
CREATE INDEX IF NOT EXISTS depreciation_matrix_qa_idx ON depreciation_matrix (((data->>'questionAnswerId')::bigint));
