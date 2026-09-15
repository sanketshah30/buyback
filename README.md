# Buyback Assessment Platform (MVP)

An agentic buyback assessment platform that lets customers sell their devices (smartphones, tablets, laptops, smartwatches) through a guided mobile-first flow: login with OTP, capture device identity, review product details, complete a physical assessment (questionnaire or AI-mocked image/video analysis), get an instant valuation, optionally run an automated diagnosis, and confirm the buyback after OTP + document verification.

This is an **MVP built on mock data** so the entire product journey can be demoed and iterated on before wiring up a real database. It's a monorepo with two independently runnable packages:

```
frontend/   React + Vite + TypeScript mobile-responsive PWA (Black & Gold theme, Mulish font)
server/     Node.js + Express + TypeScript API with an in-memory mock data layer
```

## Quick start

```bash
npm install
npm run dev:server     # http://localhost:4000
npm run dev:frontend   # http://localhost:5173 (in a second terminal)
```

Login with any 10-digit mobile number - OTPs are mocked and always `123456` (also echoed back in the UI/response as `devOtp` since there's no real SMS/email gateway wired up yet).

### Networking: how the frontend reaches the API

By default `frontend/.env` leaves `VITE_API_BASE_URL` empty, so all `/api/*` and `/uploads/*` calls are made **relative to whatever origin the page was loaded from**, and `frontend/vite.config.ts` proxies those paths to the backend (`http://localhost:4000` by default, override with `VITE_API_PROXY_TARGET`). This matters if you're viewing the frontend through a forwarded/tunneled preview URL rather than literally `http://localhost:5173` - hardcoding an absolute `http://localhost:4000` URL would otherwise resolve to *your own machine* from the browser's perspective and fail with "Failed to fetch". Only set `VITE_API_BASE_URL` to an absolute URL if you're serving the frontend separately from this proxy (e.g. a static production build hosted elsewhere) and need to point it at a specific backend host.

## Why mock data?

`server/src/repositories` defines the data-access **interfaces** the rest of the app depends on (`UserRepository`, `OtpRepository`, `CatalogRepository`, `BuybackRepository`, `PartnerRepository`, `PartnerLocationRepository`, `RoleRepository`, `UserRoleRepository`, `UserLocationHistoryRepository`). The only implementation shipped today is `inMemory/*`, backed by plain JS `Map`s that reset on restart. To move to MySQL:

1. Implement the same interfaces against `mysql2` (or an ORM like Prisma/Kysely).
2. Flip `DATA_DRIVER=mysql` in `server/.env` and fill in the `DB_*` values.
3. Wire the new classes into `server/src/repositories/index.ts`.

No routes, services, or frontend code need to change - see `server/README.md` for details.

## Product flow implemented

1. Mobile number + OTP login → dashboard with "start new buyback" and history/in-progress sections.
2. Category + brand selection, device identifier capture (16-digit numeric IMEI for smartphones, 12-16 character alphanumeric serial for everything else, with a mock "scan barcode" shortcut), and product details (product + SKU) - presented as one page with progressive accordion sections. **Nothing is sent to the server for any of this** until step 6 below - see "When does a buyback record actually get created?" in `server/README.md`. Completed sections can be reopened and edited at any point before then, purely as local state.
3. Physical assessment - questionnaire (configurable per category, single/multi-choice, with "None of these" mutually exclusive against the other accessory options), image-based AI assessment (6-side photo capture, mapped to the same questionnaire), or video-based AI assessment.
4. Instant max-value estimate + auto-generated buyback reference ID (`{{YYYYMMDD}}-{{Count}}`) - this is the moment the buyback record is actually created on the server.
5. Continue without diagnosis (configurable value drop) or continue with diagnosis (QR code hand-off, vertically centered, + live polling of a simulated diagnosis job, then a recalculated final value).
6. A single "Confirm buyback" page showing the final value alongside the customer details form; submitting it opens an OTP entry drawer (bottom sheet) with "Resend OTP" / "Send OTP over call" actions, instead of a separate page.
7. A single "Document & device proof" page for the ID/document photo, plus a second round of 6-side images if the questionnaire path was used (skipped for the AI-assessed paths, per spec).
8. Review screen (product, assessment answers, final value) → confirm → success screen → appears in dashboard history.

## Technical constraints followed

- Frontend: React + Vite + TypeScript, packaged as an installable, mobile-responsive PWA (`vite-plugin-pwa`).
- Backend: Node.js (Express + TypeScript).
- Database: mock/in-memory today, designed to be swapped for MySQL (see above).
- Connectivity check: the app blocks with a retry screen while offline (`useOnlineStatus` + `OfflineGate`).
- Permissions: camera access is explicitly requested before image/video capture steps (`useCameraPermission`); actual capture uses native `<input capture>` pickers for broad device support.
- Look & feel: Black & Gold theme, Mulish (the actively-maintained successor to the discontinued "Muli" font family) throughout.

## Repo layout

```
frontend/   See frontend/README.md (auto-generated by Vite) for scripts.
server/     See server/README.md for the full API reference and mock-data notes.
```

## Catalog data model

Categories, brands, products, and SKUs are normalized tables (each with `id` /
`createdAt` / `updatedAt` / `isActive` audit columns) plus a `sku_aliases` table mapping
trade-in/reselling partners' own SKU naming onto our canonical SKUs. Brands are
standalone - not duplicated per category - with the category/brand relationship living
on the product row instead. See the "Catalog module" section in `server/README.md` for
the full table breakdown and the reasoning behind using `POST + body` instead of
`GET + query string` for every catalog lookup.

## Partner/vendor onboarding module

Backend-only for now (no frontend UI yet): a normalized `Partner -> Partner Location ->
User -> Role` hierarchy for onboarding the retailers/vendors and their staff who operate
the buyback flow, with full CRUD APIs and a dedicated location-change endpoint that logs
an audit trail every time a user moves between locations. It deliberately reuses the same
`User` table/login as buyback customers rather than a separate entity - see the "Partner/
vendor onboarding module" section in `server/README.md` for the full design rationale and
API reference.

## Known MVP simplifications (documented for whoever wires up production)

- All data lives in server memory and resets on restart - see "Why mock data?" above.
- The category/IMEI/product/assessment steps are held in frontend memory only (`frontend/src/lib/buybackDraft.tsx`) until valuation - if the browser tab is closed or hard-refreshed before that point, that in-progress draft is lost (there's nothing to resume, by design). Once a buyback reaches valuation, it's a real, resumable backend record.
- Partner/vendor onboarding APIs are unauthorized-by-default: any authenticated user can call them today. `Role.rights` establishes the permission model but no middleware enforces it yet - see the "Partner/vendor onboarding module" section in `server/README.md`.
- OTP delivery, SMS and email are logged to the server console instead of hitting a real gateway.
- "Scan barcode" is simulated (fills a random valid IMEI/serial) rather than using a live camera barcode scanner.
- AI image/video assessment deterministically maps uploads to questionnaire answers instead of calling a real vision model.
- Diagnosis is a timed mock (completes after a few polls) instead of talking to real diagnostics hardware/SDK.
- Uploaded files are stored on local disk under `server/uploads/` instead of cloud object storage.
