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
  data/user.seed.ts       Predefined, whitelisted staff/promoter accounts + role assignments
  data/vendorPricing.seed.ts  Partner->vendor mappings + per-vendor SKU pricing
  data/depreciation.seed.ts   Depreciation config sets + their question-answer matrix
  repositories/           Data-access interfaces + in-memory implementation
    interfaces.ts          <- contracts a future MySQL implementation must satisfy
    inMemory/               <- current mock implementation (Maps in process memory)
      db.ts                  <- the "database": primary Maps + secondary indexes (see below)
      indexUtils.ts           <- tiny helper for maintaining a secondary index
      session.repository.ts   <- login sessions (separate from otp_challenges - see README below)
  services/               Business logic (auth/OTP/sessions, valuation, AI-mock assessment, diagnosis, notifications)
  middleware/              Auth guard, role/rights guard, file upload (multer), error handling
  routes/                  Express routers: auth, catalog, buyback, partners, users, questions, ...
  utils/idGenerator.ts     Auto-increment integer ID generator (every table's PK)
  utils/parseId.ts         Validates/coerces a route param or body value into a positive integer PK
  app.ts / index.ts        Express app wiring + bootstrap
```

## Swapping in a real database

1. Implement `UserRepository`, `OtpRepository`, `CatalogRepository`, and `BuybackRepository` (see `src/repositories/interfaces.ts`) against MySQL (e.g. with `mysql2`/an ORM such as Prisma or Kysely).
2. Set `DATA_DRIVER=mysql` and fill in the `DB_*` variables in `.env`.
3. Wire the new implementations into `src/repositories/index.ts` behind that flag.

No route or service code needs to change - they only depend on the repository interfaces.

## Primary keys & indexing

**Every table's primary key is a sequential integer** (`INT AUTO_INCREMENT PRIMARY KEY`,
never a UUID or a human-readable slug) - `src/utils/idGenerator.ts` hands out the next ID
per table name, and seed data (`src/data/*.seed.ts`) pre-assigns sequential IDs starting
at 1, then calls `reserveIdRange()` so IDs created afterward via the API keep counting up
without colliding with seeded rows. Foreign keys are typed `number` end to end (server
domain types, repository interfaces, route bodies, and the frontend's mirrored types) -
`src/utils/parseId.ts` validates/coerces every route param and request-body ID field into
a positive integer before it touches a repository, rejecting anything else with `400`.

Two exceptions, both deliberate:
- `OtpChallenge.requestId` stays an opaque random string (like a session token) - it's
  never a FK target from another table, and a predictable sequential ID here would let a
  client enumerate other users' in-flight OTP challenges.
- The buyback flow's hardcoded, per-category `Question`/`QuestionOption` (in
  `catalog.seed.ts`) keep semantic string codes (e.g. `"yes"`, `"none"`) since they're
  inline config embedded in a buyback record, not a normalized table, and are being
  superseded by the questionnaire-config module below.

**Every table is indexed** on its primary key (the in-memory store's primary `Map<number,
T>` for that table is the equivalent of a clustered index) plus every foreign key / column
that's actually queried by, via a secondary index maintained in `src/repositories/inMemory/db.ts`
(`indexes.*`, a `Map<key, Set<id>>` kept in sync by each repository's create/update
methods - see `indexUtils.ts`). This turns what would otherwise be a linear `.filter()`
scan into an O(1) lookup, matching exactly what a real `CREATE INDEX` statement would do
once this moves to MySQL:

| Index | Matches SQL |
| --- | --- |
| `usersByMobile` (unique) | `CREATE UNIQUE INDEX idx_users_mobile ON users(mobile)` |
| `usersByPartnerLocationId` | `CREATE INDEX idx_users_partner_location ON users(partner_location_id)` |
| `buybackRequestsByUserId` | `CREATE INDEX idx_buyback_requests_user ON buyback_requests(user_id)` |
| `partnerLocationsByPartnerId` | `CREATE INDEX idx_partner_locations_partner ON partner_locations(partner_id)` |
| `userRolesByUserId` | `CREATE INDEX idx_user_roles_user ON user_roles(user_id)` |
| `userLocationHistoryByUserId` | `CREATE INDEX idx_user_location_history_user ON user_location_history(user_id)` |
| `productsByCategory` / `productsByCategoryAndBrand` | `CREATE INDEX idx_products_category ON products(category_id)` / `CREATE INDEX idx_products_category_brand ON products(category_id, brand_id)` |
| `skusByProductId` | `CREATE INDEX idx_skus_product ON skus(product_id)` |
| `skuAliasesBySkuId` | `CREATE INDEX idx_sku_aliases_sku ON sku_aliases(sku_id)` |
| `questionTranslationsByQuestionId` | `CREATE INDEX idx_question_translations_question ON question_translations(question_id)` |
| `answerTranslationsByAnswerId` | `CREATE INDEX idx_answer_translations_answer ON answer_translations(answer_id)` |
| `questionAnswerMappingsByQuestionId` | `CREATE INDEX idx_qam_question ON question_answer_mapping(question_id)` |
| `questionnaireConfigsByProfile` / `...ByCategory` | `CREATE INDEX idx_questionnaire_config_profile ON questionnaire_config(product_category_id, brand_id, partner_id)` |

`QuestionnaireConfigRepository.resolve()` is the best example of this paying off: each of
its 4 precedence tiers is a single composite-index lookup (`questionnaireConfigsByProfile`),
never a scan over every config row.

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
the database means "applies to all" (the spec's `0` sentinel, adapted to `null` since
these are real integer FKs and `0` isn't a reserved/invalid ID here). Given an input
category (+ optional brand/partner), the **single most specific matching tier wins** -
ties are never blended:

1. Category exact + Brand exact + Partner exact
2. Category exact + Brand **wildcard** + Partner exact (partner-specificity beats brand-specificity)
3. Category exact + Brand exact + Partner **wildcard**
4. Category exact + Brand wildcard + Partner wildcard (generic fallback)

If no tier has any config rows for that category at all (e.g. an unconfigured category),
the response is an empty question list - there's no fallback below tier 4.

## Vendor pricing module (inputs to the upcoming valuation/vendor-selection engine)

Two tables that let a future calculation engine answer "given this retail partner and a
device's category/SKU, which vendor(s) could buy it, and what does each currently pay for
that SKU?" - the engine will compute a buyback value per eligible vendor and pick a
winner; these tables don't do that picking themselves, they just supply the inputs.

**"Vendor" is not a separate table** - a vendor is simply a `partners` row with
`partnerType: 'vendor'` (the same table already used for retailer partners like BestBuy).

```
partner_locations ────────────────────┐
                                       ├──▶ partner_category_vendor_mapping ──▶ partners (partnerType='vendor')
product_categories ────────────────────┘                                            │
                                                                                       ▼
                                                                              sku_pricing ◀── skus
```

| Table | Description | Foreign keys |
| --- | --- | --- |
| `partner_category_vendor_mapping` | Which vendor(s) a retail partner's specific *location* uses for buybacks in a given category - scoped to `partnerLocationId` rather than `partnerId`, since two locations of the same partner may route to different vendors. **Not unique** on (partnerLocationId, productCategoryId) - a location can have several eligible vendors per category (e.g. BestBuy New York uses both Goldie Group and QuickCash Trading for Smartphones in the seed data) | `partnerLocationId` → partner_locations.id, `productCategoryId` → product_categories.id, `vendorId` → partners.id (vendor) |
| `sku_pricing` | A vendor's buyback price for one SKU, with a validity window (`validFrom`/`validTo`, blank `validTo` = open-ended/current) - **this is now the only source of pricing in the whole app**; `products`/`skus` carry no price column at all, since the same SKU is priced differently by every vendor and changes over time | `vendorId` → partners.id (vendor), `skuId` → skus.id, `uploadedById` → users.id |

Per your explicit choice when this module was scoped: `partnerType` is **not** validated on
create/update (a `partnerId`/`vendorId` just needs to exist in `partners`, regardless of
its `partnerType`), and `sku_pricing` does **not** reject overlapping `validFrom`/`validTo`
windows for the same vendor+SKU - both are left for the dedicated pricing-update interface
and/or the calculation engine itself to enforce later.

Besides plain CRUD + `POST .../search`, each module exposes a `POST .../resolve`
convenience matching the calculation engine's expected lookup pattern:
- `POST /api/partner-category-vendor-mapping/resolve` - body `{ partnerLocationId, productCategoryId }` → the active vendor `Partner` rows for that pair.
- `POST /api/sku-pricing/resolve` - body `{ vendorId, skuId, asOf? }` → the single price row (or `null`) whose validity window covers `asOf` (defaults to now).

**The live buyback flow already depends on this module** - `products.basePrice` and
`skus.priceModifier` were removed once pricing moved here, so `POST
/api/buyback/:id/valuation` now calls `resolveBestVendorPrice()`
(`src/services/valuation.service.ts`) to get its base device price:

1. Look up the logged-in promoter's own `partnerLocationId` (same resolution as login -
   see "Authentication, sessions & role-based access" below).
2. Find every vendor mapped to that *location* + the buyback's category
   (`partner_category_vendor_mapping`).
3. For each such vendor, find its currently-valid price for the buyback's SKU
   (`sku_pricing`, filtered by `validFrom`/`validTo`).
4. **Placeholder vendor-selection algorithm**: take the highest currently-valid candidate
   price (the best deal for the customer) and record which vendor won it on
   `BuybackRequest.selectedVendorId`.

Step 4 is intentionally simple - it exists only to keep the buyback flow functional now
that the catalog has no price of its own. The real "calculate multiple buyback values,
store them, and finalize a vendor based on our algorithm" engine is the next phase; when
it ships, it should replace `resolveBestVendorPrice()` rather than needing to touch the
route that calls it. If the promoter's location has no vendor mapped for that category, or
no mapped vendor has priced that SKU yet, valuation now fails with a `422` rather than
silently using a stale catalog price.

## Depreciation module (another input to the upcoming valuation engine)

Configurable deductions applied per condition-assessment answer, scoped to a (product
category, brand, vendor?) combination - the third and last input the calculation engine
needs, alongside the catalog and the vendor pricing module above.

Split into two tables so uploading a full config batch doesn't repeat the same scoping
columns on every row - exactly the same header/detail relationship as an order and its
line items:

| Table | Description | Foreign keys |
| --- | --- | --- |
| `depreciation_config` | The header/"set": one row per (category, brand, vendor?, validity window). `productCategoryId`/`brandId` are always required exact matches; `vendorId` is nullable (`null` = applies to all vendors) | `productCategoryId` → product_categories.id, `brandId` → brands.id, `vendorId` → partners.id (vendor, nullable), `uploadedById` → users.id |
| `depreciation_matrix` | The detail/"line items": one lean row per question-answer deduction within a set - just the FK back to its set plus the deduction itself | `depreciationConfigId` → depreciation_config.id, `questionAnswerId` → question_answer_mapping.id |

```
product_categories ──┐
brands ────────────────┼──▶ depreciation_config ──1:N──▶ depreciation_matrix ◀── question_answer_mapping
partners (vendor, nullable) ┘                                  │
users (uploadedById) ────────────────────────────────────────────┘
```

Why the split matters in practice: a flat single-table design would repeat
category/brand/vendor/validity on every question-answer row - 8 brands × 40 questions =
320 rows, each duplicating the same 5 scoping columns. Here that's **8
`depreciation_config` rows** (one per brand/vendor/validity combination) and **320 lean
`depreciation_matrix` rows** (just `depreciationConfigId` + `questionAnswerId` + type +
value each) - changing a whole set's validity is a single update on its config row, not
40.

**Re-uploading versions the set, it never overwrites or duplicates it.** `POST
/api/depreciation-config` (`depreciationService.upload()`) is the whole-batch entry
point: given `{ productCategoryId, brandId, vendorId?, entries: [...] }`, if a config row
is currently open (`validTo` blank) for that *exact* (category, brand, vendor) triple, its
`validTo` is set to the new upload's timestamp, and a brand-new row is inserted starting
at that same timestamp with `validTo` blank. History is preserved - old deductions stay
queryable for whatever date range they were actually in effect, and the calculation
engine (once built) always resolves whichever row's validity window covers the buyback's
date.

`questionAnswerId` is **unique per config set** - `upload()` rejects a batch containing
the same `questionAnswerId` twice, and `POST /api/depreciation-matrix` (adding a single
new deduction to an *existing* set without re-versioning it) rejects one that would
duplicate an existing entry in that set. Per the module's scoping decisions: no uniqueness
is enforced *across* config rows themselves (re-uploading the same triple is expected and
handled by versioning above, not rejected), and how multiple matched deductions within a
resolved set eventually combine (stack vs. most-specific-wins) is deliberately undecided
until the calculation engine itself is built - `depreciationService.resolve()` only
resolves *which single config set* applies (exact vendor match, falling back to the
`vendorId: null` wildcard set), not how its matrix rows get combined.

- `POST /api/depreciation-config` - upload/version a whole set (body above)
- `PATCH /api/depreciation-config/:id` - lightweight edit (e.g. deactivate a set, or manually close its `validTo`) - not for editing individual deductions
- `GET /api/depreciation-config/:id` - fetch a set's header
- `GET /api/depreciation-config/:id/matrix` - fetch a set's full matrix of deductions
- `POST /api/depreciation-config/search` - list/filter sets (body: `{ productCategoryId?, brandId?, vendorId?, isActive? }`)
- `POST /api/depreciation-config/resolve` - calc-engine lookup: body `{ productCategoryId, brandId, vendorId?, asOf? }` → the applicable set + its full matrix, or `null`
- `POST /api/depreciation-matrix` - add a single new deduction to an existing set (body: `{ depreciationConfigId, questionAnswerId, depreciationType, depreciationValue }`)
- `PATCH /api/depreciation-matrix/:id` - correct/deactivate a single deduction
- `GET /api/depreciation-matrix/:id` - fetch a single deduction
- `POST /api/depreciation-matrix/search` - list/filter deductions (body: `{ depreciationConfigId?, questionAnswerId?, isActive? }`)

## Authentication, sessions & role-based access

Login is **whitelist-only staff/promoter login**, not open customer self-signup - this app
is used by store staff to *process* buybacks on a walk-in customer's behalf (the
customer's own name/email/mobile is captured later, mid-flow, as `BuybackRequest.customer`
- a plain field, not a `User` row).

- **`users` is a predefined table now** (`src/data/user.seed.ts`), not something OTP login
  populates on the fly. `POST /api/auth/otp/request` (purpose `login`) checks the mobile
  against an existing, active `User` **with at least one active role** and rejects it with
  `403` otherwise ("This mobile number is not registered..." / "...has no role assigned...").
  This check only applies to staff login - the *customer* confirmation OTP
  (`POST /api/buyback/:id/customer`) still works for any mobile number, since it never
  touches the `users` table.
- **OTP verification and the resulting login session are two separate tables**:
  `otp_challenges` (the short-lived, one-time code exchange, keyed by an opaque
  `requestId` - see the `OtpChallenge` doc comment in `types/domain.ts` for why it isn't a
  sequential integer PK) and `sessions` (one row per completed login, storing the issued
  JWT, `expiresAt`, and an optional `revokedAt` - FK `userId` -> `users.id`, indexed on
  `userId` and on the token itself). `requireAuth` checks **both** the JWT's own
  signature/expiry *and* that its `sessions` row hasn't been revoked/expired - this is what
  makes `POST /api/auth/logout` actually invalidate a token instead of it staying valid
  until it naturally expires.
- **Login resolves and returns `partnerId`/`partnerLocationId`/`roles` up front**, derived
  server-side from the authenticated user's record (`user.partnerLocationId` ->
  `partner_locations.partnerId`) rather than the client supplying them: `POST
  /api/auth/otp/verify` responds with `{ token, user, partnerId, partnerLocationId, roles }`.
  The frontend stores all of this in `localStorage` (`useAuth()` in `frontend/src/lib/auth.tsx`)
  for the rest of the session, so any screen can read "which partner/location am I acting
  for" without a re-fetch, and it feeds the (future) questionnaire-config `resolve()` call's
  `partnerId` - `productCategoryId`/`brandId` come from what the user picks on the first
  screen, `partnerId` comes from who's logged in.
- **Buyback processing is gated by role**: every `/api/buyback/*` route requires the
  `process_buyback` right (`requireRight('process_buyback')` in `middleware/rights.middleware.ts`,
  mounted on the whole `buybackRouter`) - only roles that grant it (Promoter, by default -
  see `roles` in `data/partner.seed.ts`) can start/process a buyback, even though any
  whitelisted, role-having user can still log in.
- **Predefined demo accounts** (`src/data/user.seed.ts`), all use OTP `123456`:

  | Mobile | Role | Can process buybacks? |
  | --- | --- | --- |
  | `9820852131` | Promoter | Yes (`process_buyback`) |
  | `9000000002` | Partner Admin | No |
  | `9000000003` | Super Admin | No |

  (Partner Admin/Super Admin don't carry `process_buyback` in the seed data - they're there
  to demonstrate the role gate rejecting a logged-in user who lacks the right, and are the
  natural place to hang future admin-only screens like partner/location/user management.)

## Mock behaviors to know about

- **OTP**: always `123456` (configurable via `MOCK_OTP_CODE`) and echoed back in API responses as `devOtp` for easy testing (no real SMS/email gateway is wired up). SMS/email "sends" are logged to the server console. Verification is rate-limited to 5 incorrect attempts per OTP request before it's locked out.
- **AI image/video assessment**: `src/services/assessment.service.ts` deterministically maps uploaded media to questionnaire answers instead of calling a real vision model.
- **Diagnosis**: `src/services/diagnosis.service.ts` simulates a paired-device diagnosis; polling `GET /api/buyback/:id/diagnosis/status` a few times (`DIAGNOSIS_COMPLETE_AFTER_POLLS`) transitions it from `pending` -> `in_progress` -> `completed` with a mock condition adjustment.
- **File uploads**: stored on local disk under `uploads/<buybackId>/` (gitignored), restricted to image/video files, and only ever served back through the authenticated, ownership-checked `GET /api/uploads/:buybackId/:filename` route (never as public static content). Replace with S3/GCS in production.
- **Production safety net**: the server refuses to start with `NODE_ENV=production` unless `JWT_SECRET` has been changed from its default and `MOCK_OTP_EXPOSE_IN_RESPONSE` is `false` (see `assertProductionSafety()` in `src/config/env.ts`) - this is a demo/MVP config guard, not a substitute for wiring up a real SMS/email OTP gateway before any real deployment.

## API overview

| Method & Path | Purpose |
| --- | --- |
| `POST /api/auth/otp/request` | Request login OTP for a mobile number (whitelist-only - `403` if the mobile isn't a registered, role-having `User`) |
| `POST /api/auth/otp/verify` | Verify OTP, creates a `sessions` row, returns `{ token, user, partnerId, partnerLocationId, roles }` |
| `POST /api/auth/logout` | Revoke the caller's session - the JWT stops working immediately, before its natural expiry |
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
| `POST /api/partner-category-vendor-mapping` | Map a vendor to a (retail partner location, category) pair |
| `PATCH /api/partner-category-vendor-mapping/:id` | Update a mapping (e.g. change vendor, deactivate) |
| `GET /api/partner-category-vendor-mapping/:id` | Fetch a mapping |
| `POST /api/partner-category-vendor-mapping/search` | List/filter mappings (body: `{ partnerLocationId?, productCategoryId?, vendorId?, isActive? }`) |
| `POST /api/partner-category-vendor-mapping/resolve` | Calc-engine lookup: body `{ partnerLocationId, productCategoryId }` → active vendor `Partner` rows |
| `POST /api/sku-pricing` | Add a vendor's price for a SKU (body: `{ vendorId, skuId, price, validFrom, validTo?, uploadedById? }` - `uploadedById` defaults to the caller) |
| `PATCH /api/sku-pricing/:id` | Update a price row (e.g. close its `validTo`, correct the price, deactivate) |
| `GET /api/sku-pricing/:id` | Fetch a price row |
| `POST /api/sku-pricing/search` | List/filter price rows (body: `{ vendorId?, skuId?, isActive? }`) |
| `POST /api/sku-pricing/resolve` | Calc-engine lookup: body `{ vendorId, skuId, asOf? }` → the price row valid at that instant, or `null` |
| `POST /api/depreciation-config` | Upload/version a whole depreciation set (body: `{ productCategoryId, brandId, vendorId?, entries: [{ questionAnswerId, depreciationType, depreciationValue }], uploadedById? }`) |
| `PATCH /api/depreciation-config/:id` | Lightweight edit of a set (deactivate, or manually close `validTo`) |
| `GET /api/depreciation-config/:id` | Fetch a set's header |
| `GET /api/depreciation-config/:id/matrix` | Fetch a set's full matrix of question-answer deductions |
| `POST /api/depreciation-config/search` | List/filter sets (body: `{ productCategoryId?, brandId?, vendorId?, isActive? }`) |
| `POST /api/depreciation-config/resolve` | Calc-engine lookup: body `{ productCategoryId, brandId, vendorId?, asOf? }` → the applicable set + matrix, or `null` |
| `POST /api/depreciation-matrix` | Add a single new deduction to an existing set |
| `PATCH /api/depreciation-matrix/:id` | Correct/deactivate a single deduction |
| `GET /api/depreciation-matrix/:id` | Fetch a single deduction |
| `POST /api/depreciation-matrix/search` | List/filter deductions (body: `{ depreciationConfigId?, questionAnswerId?, isActive? }`) |

All `/api/buyback/*`, `/api/uploads/*`, `/api/partners/*`, `/api/partner-locations/*`, `/api/roles/*`, `/api/users/*`, `/api/questions/*`, `/api/answers/*`, `/api/question-answers/*`, `/api/questionnaire-config/*`, `/api/partner-category-vendor-mapping/*`, `/api/sku-pricing/*`, `/api/depreciation-config/*`, and `/api/depreciation-matrix/*` routes require `Authorization: Bearer <token>` from the OTP login flow. `/api/buyback/*` additionally requires the caller's role to grant the `process_buyback` right (see "Authentication, sessions & role-based access" above).

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
