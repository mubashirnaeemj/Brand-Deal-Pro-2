# Threat Model

## Project Overview

MAVLIT is a pnpm workspace with a React/Vite single-page frontend (`artifacts/mavlit`) and an Express API (`artifacts/api-server`). The frontend is still largely a public product/demo experience with client-side routing and substantial static/mock content, but it also exposes live UI flows that call two production API endpoints backed by Anthropic. The backend therefore does more than serve a health check today: it publicly exposes `POST /api/pitch/generate` and `POST /api/negotiator/advise`, each of which turns attacker-controlled input into a server-side Anthropic streaming request.

Production assumptions for this scan:
- Replit deployment visibility is public, so public endpoints are internet-reachable.
- `NODE_ENV=production` in production.
- `artifacts/mockup-sandbox` is a development-only sandbox and is not deployed to production unless future evidence shows otherwise.
- Static demo records bundled into `artifacts/mavlit` are treated as intentionally public demo content for this scan unless future code shows they were replaced with real user, partner, or customer data.

## Assets

- **Deployment availability** — the public frontend and mounted `/api` endpoints must remain available and not be trivially degraded through malformed or repeated requests.
- **Anthropic API credits and backend compute budget** — the server holds a privileged Anthropic integration key and can spend paid model usage on behalf of remote callers.
- **Application secrets and infrastructure credentials** — `DATABASE_URL`, Anthropic credentials, future auth tokens, and any third-party API keys loaded through environment variables must remain server-only.
- **Future user and business data** — the UI presents workflows for creator profiles, outreach, deals, and pitch decks. Even where current values are mock/demo content, these domains will become sensitive once connected to real storage or auth.
- **API trust surface** — the Express routes, OpenAPI spec, generated client, and shared request helpers form the contract future authenticated/data-bearing routes will likely follow; mistakes here will propagate quickly.

## Trust Boundaries

- **Browser to API** — all requests from the public SPA to the Express server cross an untrusted boundary. The server must treat all client input as attacker-controlled.
- **API to Anthropic** — the API server can invoke a paid third-party model using a privileged secret key. Any public route that reaches this boundary can create direct billing and availability impact.
- **API to database** — `lib/db` creates a privileged PostgreSQL connection. Any future production route that reaches this layer can expose the full database if authorization or query safety is wrong.
- **Public internet to deployment** — because the deployment is public, any production route or static asset path is reachable by arbitrary remote users.
- **Production vs dev-only artifacts** — `artifacts/mockup-sandbox` is explicitly treated as dev-only and should usually be ignored in production scans unless deployment wiring changes.

## Scan Anchors

- Production frontend entry point: `artifacts/mavlit/src/main.tsx` and `artifacts/mavlit/src/App.tsx`.
- Production API entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, and `artifacts/api-server/src/routes/**`.
- Public production routes today: `GET /api/healthz`, `POST /api/pitch/generate`, `POST /api/negotiator/advise`, plus the SPA routes in `artifacts/mavlit/src/pages/**`.
- Highest-risk shared code today: `lib/integrations-anthropic-ai/src/client.ts`, `lib/api-client-react/src/custom-fetch.ts`, `lib/api-spec/openapi.yaml`, and `lib/db/src/**`.
- Important drift to remember: `lib/api-spec/openapi.yaml` advertises `/api/anthropic/conversations*` endpoints that are not mounted by the current Express router and omits the mounted negotiator route.
- Dev-only surface to ignore unless production reachability is demonstrated: `artifacts/mockup-sandbox/**`.

## Threat Categories

### Spoofing

There is still no live authenticated user flow in the production code. Any future route that exposes creator profiles, deals, outreach history, or internal match intelligence must require server-side authentication and must not rely on frontend navigation state, `sessionStorage`, or placeholder UI such as the current non-functional sign-in controls.

### Tampering

The browser is fully untrusted. The current AI endpoints accept free-form user input and synthesize prompts server-side, so any future persistence, pricing, or workflow state derived from those inputs must be validated and enforced on the server. Shared client helpers and generated API types improve correctness, but they are not security controls.

### Information Disclosure

The main disclosure risks are secret leakage and accidental promotion of mock/demo content into real sensitive data. Secrets must remain in server-side environment variables, API responses must avoid stack traces and provider errors, and any future real creator, outreach, or contact data must not be embedded into static frontend bundles. The existing server logger redacts authorization and cookie headers; that guarantee should be preserved as more routes are added.

### Denial of Service

The highest-current production risk is abuse of the public Anthropic-backed endpoints. Public callers can force the server to open outbound model streams and spend provider credits, so production must enforce route-appropriate authentication or abuse controls such as quotas, rate limits, concurrency caps, request size bounds, and upstream cancellation when clients disconnect. As new endpoints are added, the same principle applies to any expensive database or third-party integration path.

### Elevation of Privilege

The highest-risk future boundary remains between public users, authenticated creators, and any internal/admin capabilities that may be added later. All authorization decisions must be enforced in Express handlers or middleware before touching `lib/db` or other privileged integrations. Database access must remain parameterized through Drizzle or equivalent safe query APIs, and dev-only sandbox code must not become production-reachable without a fresh review.
