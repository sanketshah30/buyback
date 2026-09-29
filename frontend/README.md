# Buyback Frontend (MVP)

React + TypeScript + Vite PWA for the agentic buyback assessment platform - the app store
staff use to register, value, and confirm a customer's device trade-in. Talks to the API
in `../server` (see that project's README for the backend).

## Getting started

```bash
npm install
npm run dev
```

The dev server starts on `http://localhost:5173` and proxies `/api` and `/uploads` through
to the backend (see `vite.config.ts`) - by default `http://localhost:4000`, or whatever
`VITE_API_PROXY_TARGET` is set to.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `''` (empty/relative) | Prefixed onto every API/upload request path (see `src/lib/api.ts`). Leave empty to go through the Vite dev/preview server's proxy (works on plain `localhost` and through a forwarded/tunneled preview URL, since the frontend and backend are served from the *same* origin the browser loaded the page from). Only set this to an **absolute URL** (e.g. `https://your-backend.vercel.app`) when the frontend is deployed somewhere that *isn't* proxying to the backend for you - see "Deploying to Vercel" below. |
| `VITE_API_PROXY_TARGET` | `http://localhost:4000` | Where the dev/preview server's own proxy forwards `/api` and `/uploads` to - only read by `vite.config.ts`, never shipped to the browser. Irrelevant once deployed (there's no Vite dev server in production). |

Vite only reads `VITE_*` env vars **at build time** and inlines their values directly into
the built JS bundle - setting/changing one on a hosting platform's dashboard does nothing
until you trigger a new build/deploy.

## Deploying to Vercel

If you deploy this frontend and the `server/` API as **two separate Vercel projects on two
different domains** (e.g. `https://buyback-frontend.vercel.app` for this app and
`https://your-backend.vercel.app` for the API), two things need to be configured, or you'll
see the frontend's own `/api/...` calls 404 (they're resolving relative to its *own* domain,
which has no backend behind it) and/or direct links to any non-root route (e.g. `/login`)
404 as well:

1. **Set `VITE_API_BASE_URL`** in this project's Vercel environment variables to your
   backend's exact deployed URL (e.g. `https://your-backend.vercel.app`, no trailing
   slash), then **redeploy** (env var changes don't apply until a new build runs - see
   above). Also make sure the backend's `CLIENT_ORIGIN` env var is set to this frontend's
   exact URL, or its CORS check will reject every request - see `server/README.md`'s
   "Deploying to Vercel" section.
2. **`vercel.json`** (already committed at the project root) rewrites every path to
   `/index.html`, so React Router's client-side routes (e.g. `/login`, `/buyback/3/review`)
   resolve correctly on a hard refresh or a directly-typed/shared URL - without it, Vercel's
   static file host 404s on any path that isn't a literal file, since a single-page app has
   no server-side router of its own.
