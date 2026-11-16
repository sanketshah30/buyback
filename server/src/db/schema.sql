-- Buyback platform — production relational schema (Postgres / Supabase).
-- Replaces the MVP id + jsonb document tables with typed columns + FKs.
--
-- CUTOVER: this script drops existing buyback tables and recreates them.
-- Run `npm run db:migrate` then `npm run db:seed` against an empty or
-- disposable database. Do not run against a DB you need to keep without
-- a separate data migration.

BEGIN;

DROP TABLE IF EXISTS buyback_questionnaire_answers CASCADE;
DROP TABLE IF EXISTS buyback_media CASCADE;
DROP TABLE IF EXISTS buyback_vendor_calculation_log CASCADE;
DROP TABLE IF EXISTS buyback_status_history CASCADE;
DROP TABLE IF EXISTS buyback_requests CASCADE;
DROP TABLE IF EXISTS otp_challenges CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS user_location_history CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS partner_margin_config CASCADE;
DROP TABLE IF EXISTS vendor_fee_config CASCADE;
DROP TABLE IF EXISTS depreciation_matrix CASCADE;
DROP TABLE IF EXISTS depreciation_config CASCADE;
DROP TABLE IF EXISTS sku_pricing CASCADE;
DROP TABLE IF EXISTS partner_category_vendor_mapping CASCADE;
DROP TABLE IF EXISTS questionnaire_config CASCADE;
DROP TABLE IF EXISTS question_answer_mapping CASCADE;
DROP TABLE IF EXISTS answer_translations CASCADE;
DROP TABLE IF EXISTS question_translations CASCADE;
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS sku_aliases CASCADE;
DROP TABLE IF EXISTS skus CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS partner_locations CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS request_status_master CASCADE;
DROP TABLE IF EXISTS buyback_daily_sequences CASCADE;
DROP TABLE IF EXISTS id_sequences CASCADE;

-- Legacy MVP jsonb table names (safe no-ops if already dropped above)
DROP TABLE IF EXISTS master_questions CASCADE;
DROP TABLE IF EXISTS master_answers CASCADE;
DROP TABLE IF EXISTS question_answer_mappings CASCADE;
DROP TABLE IF EXISTS questionnaire_configs CASCADE;
DROP TABLE IF EXISTS partner_category_vendor_mappings CASCADE;
DROP TABLE IF EXISTS depreciation_configs CASCADE;
DROP TABLE IF EXISTS partner_margin_configs CASCADE;
DROP TABLE IF EXISTS vendor_fee_configs CASCADE;

CREATE TABLE id_sequences (
  table_name text PRIMARY KEY,
  last_value bigint NOT NULL DEFAULT 0
);

CREATE TABLE buyback_daily_sequences (
  date_key text PRIMARY KEY,
  last_value bigint NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

CREATE TABLE categories (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('smartphone', 'non-smartphone')),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE brands (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE products (
  id bigint PRIMARY KEY,
  category_id bigint NOT NULL REFERENCES categories (id),
  brand_id bigint NOT NULL REFERENCES brands (id),
  name text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX products_category_idx ON products (category_id);
CREATE INDEX products_brand_idx ON products (brand_id);
CREATE INDEX products_category_brand_idx ON products (category_id, brand_id);

CREATE TABLE skus (
  id bigint PRIMARY KEY,
  product_id bigint NOT NULL REFERENCES products (id),
  code text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX skus_product_id_idx ON skus (product_id);

CREATE TABLE sku_aliases (
  id bigint PRIMARY KEY,
  sku_id bigint NOT NULL REFERENCES skus (id),
  partner_id text NOT NULL,
  partner_sku_name text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX sku_aliases_sku_id_idx ON sku_aliases (sku_id);

-- ---------------------------------------------------------------------------
-- Partners / locations / auth (onboarding foundation)
-- ---------------------------------------------------------------------------

CREATE TABLE partners (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  country text NOT NULL,
  partner_type text NOT NULL CHECK (partner_type IN ('vendor', 'retailer')),
  unique_identifier text NOT NULL,
  email text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX partners_unique_identifier_uidx ON partners (unique_identifier) WHERE is_active;
CREATE INDEX partners_type_idx ON partners (partner_type);

CREATE TABLE partner_locations (
  id bigint PRIMARY KEY,
  partner_id bigint NOT NULL REFERENCES partners (id),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  country text NOT NULL,
  unique_identifier text NOT NULL,
  email text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX partner_locations_partner_id_idx ON partner_locations (partner_id);
CREATE UNIQUE INDEX partner_locations_unique_identifier_uidx ON partner_locations (unique_identifier) WHERE is_active;

CREATE TABLE roles (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  rights text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE users (
  id bigint PRIMARY KEY,
  mobile text NOT NULL,
  name text,
  username text,
  email text,
  partner_location_id bigint REFERENCES partner_locations (id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX users_mobile_uidx ON users (mobile);
CREATE INDEX users_partner_location_idx ON users (partner_location_id);
CREATE UNIQUE INDEX users_username_uidx ON users (username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX users_email_uidx ON users (email) WHERE email IS NOT NULL;

CREATE TABLE user_roles (
  id bigint PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users (id),
  role_id bigint NOT NULL REFERENCES roles (id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX user_roles_user_id_idx ON user_roles (user_id);
CREATE INDEX user_roles_role_id_idx ON user_roles (role_id);

CREATE TABLE user_location_history (
  id bigint PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users (id),
  from_partner_location_id bigint REFERENCES partner_locations (id),
  to_partner_location_id bigint REFERENCES partner_locations (id),
  changed_by_user_id bigint REFERENCES users (id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX user_location_history_user_id_idx ON user_location_history (user_id);

CREATE TABLE sessions (
  id bigint PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users (id),
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX sessions_token_uidx ON sessions (token);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE otp_challenges (
  request_id text PRIMARY KEY,
  mobile text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('login', 'buyback-confirmation')),
  buyback_id bigint,
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX otp_challenges_mobile_idx ON otp_challenges (mobile);

-- ---------------------------------------------------------------------------
-- Questionnaire config
-- ---------------------------------------------------------------------------

CREATE TABLE questions (
  id bigint PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('single-choice', 'multi-choice')),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE question_translations (
  id bigint PRIMARY KEY,
  question_id bigint NOT NULL REFERENCES questions (id),
  language text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX question_translations_question_id_idx ON question_translations (question_id);
CREATE UNIQUE INDEX question_translations_lang_uidx ON question_translations (question_id, language) WHERE is_active;

CREATE TABLE answers (
  id bigint PRIMARY KEY,
  code text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX answers_code_uidx ON answers (code) WHERE is_active;

CREATE TABLE answer_translations (
  id bigint PRIMARY KEY,
  answer_id bigint NOT NULL REFERENCES answers (id),
  language text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX answer_translations_answer_id_idx ON answer_translations (answer_id);
CREATE UNIQUE INDEX answer_translations_lang_uidx ON answer_translations (answer_id, language) WHERE is_active;

CREATE TABLE question_answer_mapping (
  id bigint PRIMARY KEY,
  question_id bigint NOT NULL REFERENCES questions (id),
  answer_id bigint NOT NULL REFERENCES answers (id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX question_answer_mapping_question_id_idx ON question_answer_mapping (question_id);

CREATE TABLE questionnaire_config (
  id bigint PRIMARY KEY,
  product_category_id bigint NOT NULL REFERENCES categories (id),
  brand_id bigint REFERENCES brands (id),
  partner_id bigint REFERENCES partners (id),
  question_answer_id bigint NOT NULL REFERENCES question_answer_mapping (id),
  sequence integer NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX questionnaire_config_scope_idx ON questionnaire_config (product_category_id, brand_id, partner_id);

-- ---------------------------------------------------------------------------
-- Pricing / depreciation / fees
-- ---------------------------------------------------------------------------

CREATE TABLE partner_category_vendor_mapping (
  id bigint PRIMARY KEY,
  partner_location_id bigint NOT NULL REFERENCES partner_locations (id),
  product_category_id bigint NOT NULL REFERENCES categories (id),
  vendor_id bigint NOT NULL REFERENCES partners (id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX pcv_mapping_location_category_idx ON partner_category_vendor_mapping (partner_location_id, product_category_id);
CREATE INDEX pcv_mapping_vendor_idx ON partner_category_vendor_mapping (vendor_id);

CREATE TABLE sku_pricing (
  id bigint PRIMARY KEY,
  vendor_id bigint NOT NULL REFERENCES partners (id),
  sku_id bigint NOT NULL REFERENCES skus (id),
  price numeric(12, 2) NOT NULL,
  valid_from timestamptz NOT NULL,
  valid_to timestamptz,
  uploaded_by_id bigint NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX sku_pricing_vendor_sku_idx ON sku_pricing (vendor_id, sku_id);

CREATE TABLE depreciation_config (
  id bigint PRIMARY KEY,
  product_category_id bigint NOT NULL REFERENCES categories (id),
  brand_id bigint NOT NULL REFERENCES brands (id),
  vendor_id bigint REFERENCES partners (id),
  valid_from timestamptz NOT NULL,
  valid_to timestamptz,
  uploaded_by_id bigint NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX depreciation_config_scope_idx ON depreciation_config (product_category_id, brand_id, vendor_id);

CREATE TABLE depreciation_matrix (
  id bigint PRIMARY KEY,
  depreciation_config_id bigint NOT NULL REFERENCES depreciation_config (id),
  question_answer_id bigint NOT NULL REFERENCES question_answer_mapping (id),
  depreciation_type text NOT NULL CHECK (depreciation_type IN ('percentage', 'absolute')),
  depreciation_value numeric(12, 4) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX depreciation_matrix_config_qa_uidx
  ON depreciation_matrix (depreciation_config_id, question_answer_id)
  WHERE is_active;

CREATE TABLE partner_margin_config (
  id bigint PRIMARY KEY,
  partner_id bigint NOT NULL REFERENCES partners (id),
  partner_location_id bigint NOT NULL DEFAULT 0,
  product_category_id bigint NOT NULL REFERENCES categories (id),
  margin_percent numeric(8, 4) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX partner_margin_config_scope_idx
  ON partner_margin_config (partner_id, partner_location_id, product_category_id);

CREATE TABLE vendor_fee_config (
  id bigint PRIMARY KEY,
  vendor_id bigint NOT NULL REFERENCES partners (id),
  product_category_id bigint NOT NULL REFERENCES categories (id),
  fee_amount numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX vendor_fee_config_scope_idx ON vendor_fee_config (vendor_id, product_category_id);

CREATE TABLE request_status_master (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  sequence integer NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX request_status_master_name_uidx ON request_status_master (name);

-- ---------------------------------------------------------------------------
-- Buyback requests + child tables (reporting-friendly)
-- ---------------------------------------------------------------------------

CREATE TABLE buyback_requests (
  id bigint PRIMARY KEY,
  reference_id text,
  user_id bigint NOT NULL REFERENCES users (id),
  status text NOT NULL,
  request_status_id bigint REFERENCES request_status_master (id),
  partner_location_id bigint REFERENCES partner_locations (id),
  category_id bigint REFERENCES categories (id),
  brand_id bigint REFERENCES brands (id),
  product_id bigint REFERENCES products (id),
  sku_id bigint REFERENCES skus (id),
  identifier_type text CHECK (identifier_type IS NULL OR identifier_type IN ('imei', 'serial')),
  identifier_value text,
  assessment_method text CHECK (
    assessment_method IS NULL OR assessment_method IN ('questionnaire', 'image', 'video')
  ),
  max_value numeric(12, 2),
  allocated_vendor_id bigint REFERENCES partners (id),
  retailer_value numeric(12, 2),
  customer_value numeric(12, 2),
  vendor_payable numeric(12, 2),
  with_diagnosis boolean,
  final_value numeric(12, 2),
  -- Diagnosis state (flattened)
  diagnosis_id text,
  diagnosis_qr_token text,
  diagnosis_status text CHECK (
    diagnosis_status IS NULL
    OR diagnosis_status IN ('not_started', 'pending', 'in_progress', 'completed')
  ),
  diagnosis_poll_count integer,
  diagnosis_required_polls integer,
  diagnosis_result_adjustment_percent numeric(8, 4),
  diagnosis_findings text[],
  diagnosis_completed_at timestamptz,
  -- Customer
  customer_name text,
  customer_email text,
  customer_mobile text,
  customer_otp_request_id text,
  customer_otp_verified boolean,
  -- AI assessment summary (answers live in buyback_questionnaire_answers)
  ai_assessment_method text CHECK (
    ai_assessment_method IS NULL OR ai_assessment_method IN ('image', 'video')
  ),
  ai_assessment_media_count integer,
  ai_assessment_summary text,
  ai_assessment_confidence numeric(6, 4),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE INDEX buyback_requests_user_id_idx ON buyback_requests (user_id);
CREATE INDEX buyback_requests_status_idx ON buyback_requests (status);
CREATE INDEX buyback_requests_request_status_idx ON buyback_requests (request_status_id);
CREATE INDEX buyback_requests_partner_location_idx ON buyback_requests (partner_location_id);
CREATE INDEX buyback_requests_sku_id_idx ON buyback_requests (sku_id);
CREATE INDEX buyback_requests_reference_id_idx ON buyback_requests (reference_id);
CREATE INDEX buyback_requests_created_at_idx ON buyback_requests (created_at);

CREATE TABLE buyback_questionnaire_answers (
  id bigserial PRIMARY KEY,
  buyback_request_id bigint NOT NULL REFERENCES buyback_requests (id) ON DELETE CASCADE,
  question_id bigint NOT NULL REFERENCES questions (id),
  question_answer_id bigint NOT NULL REFERENCES question_answer_mapping (id)
);
CREATE INDEX buyback_qa_buyback_idx ON buyback_questionnaire_answers (buyback_request_id);
CREATE INDEX buyback_qa_question_idx ON buyback_questionnaire_answers (question_id);

CREATE TABLE buyback_media (
  id bigserial PRIMARY KEY,
  buyback_request_id bigint NOT NULL REFERENCES buyback_requests (id) ON DELETE CASCADE,
  media_kind text NOT NULL CHECK (
    media_kind IN (
      'assessment_image',
      'assessment_video',
      'document_proof',
      'product_image',
      'receipt'
    )
  ),
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX buyback_media_buyback_idx ON buyback_media (buyback_request_id);
CREATE INDEX buyback_media_kind_idx ON buyback_media (buyback_request_id, media_kind);

CREATE TABLE buyback_status_history (
  id bigint PRIMARY KEY,
  buyback_request_id bigint NOT NULL REFERENCES buyback_requests (id) ON DELETE CASCADE,
  request_status_id bigint NOT NULL REFERENCES request_status_master (id),
  changed_by_user_id bigint REFERENCES users (id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX buyback_status_history_buyback_idx ON buyback_status_history (buyback_request_id);

CREATE TABLE buyback_vendor_calculation_log (
  id bigint PRIMARY KEY,
  buyback_request_id bigint NOT NULL REFERENCES buyback_requests (id) ON DELETE CASCADE,
  vendor_id bigint NOT NULL REFERENCES partners (id),
  sku_pricing_id bigint NOT NULL REFERENCES sku_pricing (id),
  depreciation_config_id bigint REFERENCES depreciation_config (id),
  sku_price numeric(12, 2) NOT NULL,
  total_depreciation_amount numeric(12, 2) NOT NULL,
  buyback_value numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX buyback_vendor_calc_buyback_idx ON buyback_vendor_calculation_log (buyback_request_id);
CREATE INDEX buyback_vendor_calc_vendor_idx ON buyback_vendor_calculation_log (vendor_id);

-- FK for OTP buyback_id once buyback_requests exists
ALTER TABLE otp_challenges
  ADD CONSTRAINT otp_challenges_buyback_id_fkey
  FOREIGN KEY (buyback_id) REFERENCES buyback_requests (id);

COMMIT;
