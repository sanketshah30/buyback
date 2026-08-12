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

## Mock behaviors to know about

- **OTP**: always `123456` (configurable via `MOCK_OTP_CODE`) and echoed back in API responses as `devOtp` for easy testing (no real SMS/email gateway is wired up). SMS/email "sends" are logged to the server console.
- **AI image/video assessment**: `src/services/assessment.service.ts` deterministically maps uploaded media to questionnaire answers instead of calling a real vision model.
- **Diagnosis**: `src/services/diagnosis.service.ts` simulates a paired-device diagnosis; polling `GET /api/buyback/:id/diagnosis/status` a few times (`DIAGNOSIS_COMPLETE_AFTER_POLLS`) transitions it from `pending` -> `in_progress` -> `completed` with a mock condition adjustment.
- **File uploads**: stored on local disk under `uploads/` (gitignored) and served from `/uploads/*`. Replace with S3/GCS in production.

## API overview

| Method & Path | Purpose |
| --- | --- |
| `POST /api/auth/otp/request` | Request login OTP for a mobile number |
| `POST /api/auth/otp/verify` | Verify OTP, returns JWT + user |
| `GET /api/catalog/categories` | List product categories |
| `GET /api/catalog/brands?categoryId=` | List brands for a category |
| `GET /api/catalog/models?categoryId=&brandId=` | List models |
| `GET /api/catalog/skus?modelId=` | List SKUs for a model |
| `GET /api/catalog/questions?categoryId=` | Configurable questionnaire for a category |
| `GET /api/buyback` | List the authenticated user's buyback history |
| `POST /api/buyback` | Start a new buyback draft (category + brand) |
| `GET /api/buyback/:id` | Fetch a buyback request |
| `PATCH /api/buyback/:id/device` | Capture IMEI/serial number |
| `PATCH /api/buyback/:id/product` | Select model + SKU |
| `POST /api/buyback/:id/assessment/questionnaire` | Submit questionnaire answers |
| `POST /api/buyback/:id/assessment/images` | Upload 6-side images -> AI-mapped answers |
| `POST /api/buyback/:id/assessment/video` | Upload a video -> AI-mapped answers |
| `POST /api/buyback/:id/valuation` | Compute max value + generate `{{YYYYMMDD}}-{{Count}}` buyback ID |
| `POST /api/buyback/:id/diagnosis/initiate` | Start the optional QR-based diagnosis |
| `GET /api/buyback/:id/diagnosis/status` | Poll diagnosis progress/result |
| `POST /api/buyback/:id/finalize-value` | Apply the no-diagnosis value drop |
| `POST /api/buyback/:id/customer` | Submit name/email/mobile, sends confirmation OTP |
| `POST /api/buyback/:id/customer/verify-otp` | Verify the confirmation OTP |
| `POST /api/buyback/:id/documents` | Upload ID/document proof image |
| `POST /api/buyback/:id/product-images` | Upload 6-side images (only required for the questionnaire path) |
| `POST /api/buyback/:id/confirm` | Confirm the buyback - moves it into history |

All `/api/buyback/*` routes require `Authorization: Bearer <token>` from the OTP login flow.

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
