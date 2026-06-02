# Threat Model

## Project Overview

MAVLIT is a pnpm workspace with a React/Vite single-page frontend (`artifacts/mavlit`) and an Express API (`artifacts/api-server`). In the current production code, the frontend is primarily a static product/demo experience with client-side routing and mock data, while the backend exposes only a health check endpoint under `/api`. PostgreSQL and Drizzle are wired in through `lib/db`, but there is no active production data model or query path yet.

Production assumptions for this scan:
- Replit deployment visibility is public, so public endpoints are internet-reachable.
- `NODE_ENV=production` in production.
- `artifacts/mockup-sandbox` is a development-only sandbox and is not deployed to production unless future evidence shows otherwise.

## Assets

- **Deployment availability** — the public frontend and `/api/healthz` endpoint must remain available and not be trivially crashed through malformed requests.
- **Future user and business data** — the UI presents workflows for creator profiles, outreach, deals, and pitch decks. Even though current code uses mock data, these domains will become sensitive once connected to real storage or auth.
- **Application secrets and infrastructure credentials** — `DATABASE_URL`, future auth tokens, and any third-party API keys loaded through environment variables must remain server-only.
- **API trust surface** — the generated client, OpenAPI spec, and Express app form the contract future authenticated/data-bearing routes will likely follow; mistakes here would affect all later endpoints.

## Trust Boundaries

- **Browser to API** — all requests from the public SPA to the Express server cross an untrusted boundary. The server must treat all client input as attacker-controlled.
- **API to database** — `lib/db` creates a privileged PostgreSQL connection. Any future production route that reaches this layer can expose the full database if authorization or query safety is wrong.
- **Public internet to deployment** — because the deployment is public, any production route or static asset path is reachable by arbitrary remote users.
- **Production vs dev-only artifacts** — `artifacts/mockup-sandbox` is explicitly treated as dev-only and should usually be ignored in production scans unless deployment wiring changes.

## Scan Anchors

- Production frontend entry point: `artifacts/mavlit/src/main.tsx` and `artifacts/mavlit/src/App.tsx`.
- Production API entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, and `artifacts/api-server/src/routes/**`.
- Highest-risk future shared code: `lib/api-client-react/src/custom-fetch.ts`, `lib/api-spec/openapi.yaml`, and `lib/db/src/**`.
- Public surface today: the SPA routes in `artifacts/mavlit/src/pages/**` and `GET /api/healthz`.
- Dev-only surface to ignore unless production reachability is demonstrated: `artifacts/mockup-sandbox/**`.

## Threat Categories

### Spoofing

There is no live authentication flow in the current production code, but the app structure strongly suggests future authenticated creator workflows. Any future route that exposes profile, deal, or outreach data must require server-side authentication and must not rely on frontend navigation state or placeholder UI controls such as the current “Sign In” button.

### Tampering

The browser is fully untrusted. If the current mock workflows are later connected to persistent APIs, server-side validation must enforce all business rules for creator profiles, rates, deal stages, and outreach content. Shared client helpers and generated API types are useful for correctness, but they are not security controls.

### Information Disclosure

The main disclosure risk today is accidental exposure as the app evolves: secrets must stay in server-side environment variables, API responses must avoid stack traces and unnecessary internal details, and any future real creator/deal data must not be embedded into static frontend bundles. The existing server logger already redacts authorization and cookie headers; that guarantee should be preserved as more routes are added.

### Denial of Service

The API currently accepts JSON and URL-encoded bodies globally, and the deployment is public. As new public or authenticated endpoints are added, the server must bound request sizes and apply route-appropriate rate limits so attackers cannot exhaust resources with oversized bodies or repeated requests.

### Elevation of Privilege

The highest-risk future boundary is between public users, authenticated creators, and any internal/admin capabilities that may be added later. All authorization decisions must be enforced in Express handlers or middleware before touching `lib/db`. Database access must remain parameterized through Drizzle or equivalent safe query APIs, and dev-only sandbox code must not become production-reachable without a fresh review.
