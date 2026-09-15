# Buyback Server (MVP)

Node.js + Express + TypeScript API for the agentic buyback assessment platform. This MVP uses an **in-memory mock data layer** so the entire product flow described in the spec can be exercised end-to-end without a real database. It's structured so the mock layer can be swapped for MySQL with no changes to routes/services.

## Getting started

```bash
npm install
npm run dev
```

The server starts on `http://localhost:4000` (see `.env`). A `.env` file with safe MVP defaults is already committed; copy `.env.example` if you need a fresh copy or want to override values locally (put personal overrides in an untracked `.env.local` instead of editing the tracked `.env`).

## Project layout

```
src/
  config/env.ts          Centralized environment configuration
  types/domain.ts         Shared domain types (BuybackRequest, Category, Question, ...)
  data/catalog.seed.ts    Mock catalog + configurable questionnaire data
  repositories/           Data-access interfaces + in-memory implementation
    interfaces.ts          <- contracts a future MySQL implementation must satisfy
    inMemory/               <- current mock implementation (Maps in process memory)
  services/               Business logic (auth/OTP, valuation, AI-mock assessment, diagnosis, notifications)
  middleware/              Auth guard, file upload (multer), error handling
  routes/                  Express routers: auth, catalog, buyback
  app.ts / index.ts        Express app wiring + bootstrap
```

## Swapping in a real database

1. Implement `UserRepository`, `OtpRepository`, `CatalogRepository`, and `BuybackRepository` (see `src/repositories/interfaces.ts`) against MySQL (e.g. with `mysql2`/an ORM such as Prisma or Kysely).
2. Set `DATA_DRIVER=mysql` and fill in the `DB_*` variables in `.env`.
3. Wire the new implementations into `src/repositories/index.ts` behind that flag.

No route or service code needs to change - they only depend on the repository interfaces.

## Catalog module (categories, brands, products, SKUs, SKU aliases)

The catalog is normalized into 5 tables (`src/data/catalog.seed.ts`), each carrying the
standard audit columns `id` / `createdAt` / `updatedAt` / `isActive` (see `BaseEntity` in
`src/types/domain.ts`):

| Table | Description | Foreign keys |
| --- | --- | --- |
| `product_categories` | Smartphones, Tablets, Laptops, Smartwatches | - |
| `brands` | Apple, Samsung, OnePlus, ... - **standalone**, not scoped to a category | - |
| `products` | iPhone 13, Galaxy S23, MacBook Air M1, ... | `categoryId` → product_categories.id, `brandId` → brands.id |
| `skus` | iPhone 13 128GB Blue, ... | `productId` → products.id |
| `sku_aliases` | Partner-side SKU naming/IDs mapped onto our canonical SKU (e.g. a trade-in partner's own product catalog) | `skuId` → skus.id |

Brands are intentionally **not** duplicated per category - the same `brand-apple` row is
reused whether Apple is selling smartphones, tablets, laptops, or watches; the
category/brand relationship lives on `products` instead, which is what keeps this
normalized (no repeated "Apple" rows with different IDs).

All catalog lookups are **`POST` with the filter in the JSON body, never a `GET` with a
query string** - this keeps parameter values (which can include partner/internal
identifiers) out of server access logs, proxy logs, and browser history. They're still
pure reads; POST is used purely as the transport (browsers' `fetch()`/`XHR` don't allow a
body on `GET`/`HEAD` anyway, so this is also the only option that works from the frontend
as-is).

## Partner/vendor onboarding module

A normalized hierarchy for onboarding the businesses (and their staff) that operate the
buyback flow on the ground, seeded with mock data in `src/data/partner.seed.ts` but -
unlike the read-only product catalog - **fully mutable via CRUD APIs**, since onboarding
new partners/locations/users/roles is the point of this module:

```
Partner ──1:N──▶ PartnerLocation ──1:N──▶ User ──N:M──▶ Role
 (business)         (a store/site)      (staff, via   (via UserRole
                                        current           mapping)
                                     partnerLocationId)
```

| Table | Description | Foreign keys |
| --- | --- | --- |
| `partners` | The business entity on either side of a buyback - a **retailer** is a customer-facing purchase partner (e.g. a BestBuy storefront), a **vendor** is who collected devices are sold on to (e.g. a refurbisher) | - |
| `partner_locations` | An individual physical location of a partner (e.g. "BestBuy New York") | `partnerId` → partners.id |
| `users` | **The same `User` table used for buyback-customer OTP login** (see below) - a user's `partnerLocationId` is their *current* location | `partnerLocationId` → partner_locations.id |
| `roles` | Master list of roles (Partner Admin, Promoter, Vendor Admin, ...); `rights` is a structured list of permission-key strings (e.g. `manage_locations`) rather than free text | - |
| `user_roles` | Many-to-many: one user can hold multiple roles | `userId` → users.id, `roleId` → roles.id |
| `user_location_history` | Append-only audit log - a new row is written every time a user's current location changes | `userId` → users.id, `fromPartnerLocationId`/`toPartnerLocationId` → partner_locations.id |

**Why `User` is shared with buyback customers, not a separate table:** partner/vendor
staff (promoters, admins) are just as much "users of the app" as buyback customers - they
authenticate through the exact same mobile+OTP flow (`src/services/auth.service.ts`).
Onboarding a staff member (`POST /api/users`) is an **upsert keyed by mobile number**: if
that mobile already has a plain customer `User` row (from a previous OTP login), it's
updated in place with `username`/`email`/`partnerLocationId`/roles rather than erroring,
since a person's login identity and their staff profile are the same record. The next
time they log in via OTP, `findByMobile` naturally finds that same, now-enriched, record.

**Location changes are tracked deliberately**, not just via a general profile update:
`POST /api/users/:id/location` is the one sanctioned way to move a user day-to-day, and it
always writes a `user_location_history` row recording the from/to location. The general
`PATCH /api/users/:id` only touches profile fields (username/email/name/isActive), not
location, to keep that audit trail meaningful.

**Authorization is data-modeled but not yet enforced**: `Role.rights` gives every role a
structured permission list, but no middleware currently checks a caller's rights before
allowing a mutation (e.g. anyone authenticated can call `POST /api/partners`) - this MVP
only establishes the schema for that; wiring up actual authorization checks against
`rights` is a follow-up.

## Questionnaire configuration module

A config-driven engine for deciding which physical-assessment questions to show, based on
the product category + brand + partner the app is currently working with. **This is
additive/config-only for now** - it is not yet wired into the live buyback flow, which
still uses the hardcoded `questionsByCategory` in `src/data/catalog.seed.ts`; that
integration (and answer-to-valuation scoring) is a follow-up phase.

```
questions ──1:N──▶ question_translations
   │
   │ N:M (via question_answer_mapping)
   ▼
answers ──1:N──▶ answer_translations

questionnaire_config: (product_category, brand?, partner?) ──▶ question_answer_mapping, sequence
```

| Table | Description | Foreign keys |
| --- | --- | --- |
| `questions` | Language-agnostic question "concept" (just a `type`: single/multi-choice) | - |
| `question_translations` | Display text per language | `questionId` → questions.id |
| `answers` | Language-agnostic answer "concept" (`code` is a stable key like `"yes"`, for programmatic reference) | - |
| `answer_translations` | Display text per language | `answerId` → answers.id |
| `question_answer_mapping` | "This Answer is a valid option for this Question" | `questionId` → questions.id, `answerId` → answers.id |
| `questionnaire_config` | Which question-answer options apply for a (category, brand, partner) combo, and their display order | `productCategoryId` → product_categories.id (required), `brandId`/`partnerId` → brands.id/partners.id (nullable = wildcard) |

**Why Language isn't a column on `questions`/`answers` directly:** baking it in would mean
every translation needs its own separate row with its own ID, which then forces
`question_answer_mapping` and `questionnaire_config` to be duplicated per language too.
Splitting language out into `*_translations` child tables means one mapping/config works
across every language - display text is just resolved at read time (falling back to
English if a translation is missing).

**Resolution rule** (`POST /api/questionnaire-config/resolve`): Product Category is always
required and matched exactly (never a wildcard). Brand/Partner are optional - `null` in
the database means "applies to all" (adapted from the spec's `0` sentinel, since these
reference the catalog/partner-onboarding modules' real string IDs rather than integers).
Given an input category (+ optional brand/partner), the **single most specific matching
tier wins** - ties are never blended:

1. Category exact + Brand exact + Partner exact
2. Category exact + Brand **wildcard** + Partner exact (partner-specificity beats brand-specificity)
3. Category exact + Brand exact + Partner **wildcard**
4. Category exact + Brand wildcard + Partner wildcard (generic fallback)

If no tier has any config rows for that category at all (e.g. an unconfigured category),
the response is an empty question list - there's no fallback below tier 4.

## Mock behaviors to know about

- **OTP**: always `123456` (configurable via `MOCK_OTP_CODE`) and echoed back in API responses as `devOtp` for easy testing (no real SMS/email gateway is wired up). SMS/email "sends" are logged to the server console. Verification is rate-limited to 5 incorrect attempts per OTP request before it's locked out.
- **AI image/video assessment**: `src/services/assessment.service.ts` deterministically maps uploaded media to questionnaire answers instead of calling a real vision model.
- **Diagnosis**: `src/services/diagnosis.service.ts` simulates a paired-device diagnosis; polling `GET /api/buyback/:id/diagnosis/status` a few times (`DIAGNOSIS_COMPLETE_AFTER_POLLS`) transitions it from `pending` -> `in_progress` -> `completed` with a mock condition adjustment.
- **File uploads**: stored on local disk under `uploads/<buybackId>/` (gitignored), restricted to image/video files, and only ever served back through the authenticated, ownership-checked `GET /api/uploads/:buybackId/:filename` route (never as public static content). Replace with S3/GCS in production.
- **Production safety net**: the server refuses to start with `NODE_ENV=production` unless `JWT_SECRET` has been changed from its default and `MOCK_OTP_EXPOSE_IN_RESPONSE` is `false` (see `assertProductionSafety()` in `src/config/env.ts`) - this is a demo/MVP config guard, not a substitute for wiring up a real SMS/email OTP gateway before any real deployment.

## API overview

| Method & Path | Purpose |
| --- | --- |
| `POST /api/auth/otp/request` | Request login OTP for a mobile number |
| `POST /api/auth/otp/verify` | Verify OTP, returns JWT + user |
| `POST /api/catalog/categories` | List product categories |
| `POST /api/catalog/brands` | List brands for a category (body: `{ categoryId }`) |
| `POST /api/catalog/products` | List products for a category+brand (body: `{ categoryId, brandId }`) |
| `POST /api/catalog/skus` | List SKUs for a product (body: `{ productId }`) |
| `POST /api/catalog/sku-aliases` | List partner SKU aliases for a SKU (body: `{ skuId }`) |
| `POST /api/catalog/questions` | Configurable questionnaire for a category (body: `{ categoryId }`) |
| `GET /api/buyback` | List the authenticated user's buyback history |
| `POST /api/buyback` | Start a new buyback draft (category + brand) |
| `GET /api/buyback/:id` | Fetch a buyback request |
| `PATCH /api/buyback/:id/device` | Capture IMEI/serial number |
| `PATCH /api/buyback/:id/product` | Select product + SKU (server re-validates they belong to the buyback's category/brand) |
| `POST /api/buyback/:id/assessment/questionnaire` | Submit questionnaire answers (server re-validates every question is answered with a valid option) |
| `POST /api/buyback/:id/assessment/images` | Upload 6-side images -> AI-mapped answers |
| `POST /api/buyback/:id/assessment/video` | Upload a video -> AI-mapped answers |
| `POST /api/buyback/:id/valuation` | Compute max value + generate `{{YYYYMMDD}}-{{Count}}` buyback ID |
| `POST /api/buyback/:id/diagnosis/initiate` | Start the optional QR-based diagnosis |
| `GET /api/buyback/:id/diagnosis/status` | Poll diagnosis progress/result |
| `POST /api/buyback/:id/finalize-value` | Apply the no-diagnosis value drop |
| `POST /api/buyback/:id/customer` | Submit name/email/mobile, sends confirmation OTP |
| `POST /api/buyback/:id/customer/verify-otp` | Verify the confirmation OTP |
| `POST /api/buyback/:id/documents` | Upload ID/document proof image |
| `POST /api/buyback/:id/product-images` | Upload 6-side images (only required for the questionnaire path; enforced again at confirm time) |
| `POST /api/buyback/:id/confirm` | Confirm the buyback - moves it into history |
| `GET /api/uploads/:buybackId/:filename` | Fetch an uploaded file - requires auth + ownership of that buyback |
| `POST /api/partners` | Create a partner |
| `PATCH /api/partners/:id` | Update a partner |
| `GET /api/partners/:id` | Fetch a partner |
| `POST /api/partners/search` | List/filter partners (body: `{ isActive?, partnerType? }`) |
| `POST /api/partner-locations` | Create a partner location (body includes `partnerId`) |
| `PATCH /api/partner-locations/:id` | Update a partner location |
| `GET /api/partner-locations/:id` | Fetch a partner location |
| `POST /api/partner-locations/search` | List/filter locations (body: `{ partnerId?, isActive? }`) |
| `POST /api/roles` | Create a role |
| `PATCH /api/roles/:id` | Update a role |
| `GET /api/roles/:id` | Fetch a role |
| `POST /api/roles/search` | List/filter roles (body: `{ isActive? }`) |
| `POST /api/users` | Onboard a partner/vendor staff user (upsert by mobile; body may include `partnerLocationId` and `roleIds`) |
| `PATCH /api/users/:id` | Update a user's profile fields (not location - see below) |
| `GET /api/users/:id` | Fetch a user |
| `POST /api/users/search` | List/filter users (body: `{ partnerLocationId?, isActive? }`) |
| `POST /api/users/:id/location` | Change a user's current location - always logs a `user_location_history` entry |
| `GET /api/users/:id/location-history` | List a user's location-change history |
| `GET /api/users/:id/roles` | List a user's currently-assigned roles |
| `POST /api/users/:id/roles` | Assign a role to a user |
| `DELETE /api/users/:id/roles/:roleId` | Revoke a role from a user |
| `POST /api/questions` | Create a question (optionally with initial translations) |
| `PATCH /api/questions/:id` | Update a question |
| `GET /api/questions/:id` | Fetch a question |
| `POST /api/questions/search` | List/filter questions (body: `{ isActive? }`) |
| `GET /api/questions/:id/translations` | List a question's translations |
| `POST /api/questions/:id/translations` | Add/update a translation (upsert by language) |
| `POST /api/answers` | Create an answer (optionally with initial translations) |
| `PATCH /api/answers/:id` | Update an answer |
| `GET /api/answers/:id` | Fetch an answer |
| `POST /api/answers/search` | List/filter answers (body: `{ isActive? }`) |
| `GET /api/answers/:id/translations` | List an answer's translations |
| `POST /api/answers/:id/translations` | Add/update a translation (upsert by language) |
| `POST /api/question-answers` | Map an answer as a valid option for a question |
| `PATCH /api/question-answers/:id` | Update a mapping (e.g. deactivate) |
| `GET /api/question-answers/:id` | Fetch a mapping |
| `POST /api/question-answers/search` | List mappings (body: `{ questionId?, isActive? }`) |
| `POST /api/questionnaire-config` | Create a (category, brand?, partner?) → question-answer + sequence config row |
| `PATCH /api/questionnaire-config/:id` | Update a config row |
| `GET /api/questionnaire-config/:id` | Fetch a config row |
| `POST /api/questionnaire-config/search` | List/filter config rows |
| `POST /api/questionnaire-config/resolve` | **Main endpoint**: body `{ productCategoryId, brandId?, partnerId?, language? }` → the resolved, sequenced questionnaire |

All `/api/buyback/*`, `/api/uploads/*`, `/api/partners/*`, `/api/partner-locations/*`, `/api/roles/*`, `/api/users/*`, `/api/questions/*`, `/api/answers/*`, `/api/question-answers/*`, and `/api/questionnaire-config/*` routes require `Authorization: Bearer <token>` from the OTP login flow.

### When does a buyback record actually get created?

The frontend's category/brand/IMEI/product/assessment steps are all held as local, unsaved
state (see `frontend/src/lib/buybackDraft.tsx`) - **no `POST /api/buyback` call happens
until the user finishes the physical assessment and reaches the valuation step**. At that
point the frontend replays everything it collected in one go (`create` → `device` →
`product` → `assessment` → `valuation`), so the buyback record only comes into existence,
and only gets its `{{YYYYMMDD}}-{{Count}}` reference ID, at the exact moment its max value
is calculated. This means abandoning the flow before reaching valuation never leaves a
stray draft behind, and editing category/IMEI/product before that point never needs to
touch the server at all.
