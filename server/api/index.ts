import { assertProductionSafety } from '../src/config/env';
import { createApp } from '../src/app';

/**
 * Vercel serverless entrypoint. Vercel's Node runtime treats any default-
 * exported `(req, res) => ...`-shaped value in `api/*.ts` as the function
 * handler - an Express app satisfies that signature directly, so no extra
 * adapter is needed. This is a separate file from `src/index.ts` (the
 * plain `app.listen()` entrypoint used for local dev / a traditional
 * long-running Node process) because a serverless function must never call
 * `.listen()` itself - the platform owns the actual HTTP server.
 *
 * Paired with `server/vercel.json`, which rewrites every request to this
 * one function (there's no static content on this project to route
 * around) - Express still sees the original incoming path (e.g.
 * `/api/health`), since every route in `src/app.ts` is itself mounted
 * under the `/api/...` prefix already.
 *
 * `assertProductionSafety()` still runs here, same as the plain-Node
 * entrypoint - Vercel sets `NODE_ENV=production` automatically, so this
 * will throw at cold-start (surfacing as a 500 in the function logs) until
 * you've actually set `JWT_SECRET`, `MOCK_OTP_EXPOSE_IN_RESPONSE=false`,
 * and `MOCK_OTP_CODE` as real env vars on the Vercel project - see
 * server/README.md's "Deploying to Vercel" section.
 */
assertProductionSafety();

export default createApp();
