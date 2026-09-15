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

All `/api/buyback/*` and `/api/uploads/*` routes require `Authorization: Bearer <token>` from the OTP login flow.

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
