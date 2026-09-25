---
name: MAVLIT API integration
description: External API authentication, pitch lifecycle, CORS, and the frontend-only onboarding boundary
---

# MAVLIT API Integration

## Auth model
- Cookie-based JWT only — `credentials: "include"` on every request
- `POST /auth/login` → sets `access_token` httpOnly cookie; response body is full CreatorProfile
- `POST /auth/logout` → clears cookie
- `GET /creator-profile/me` — session validation on mount in AuthContext
- AuthContext (`artifacts/mavlit/src/contexts/AuthContext.tsx`) is the single source of truth for user state; caches to `mavlit_profile_cache` in localStorage as a loading fallback

## ProtectedRoute
- Authenticated app pages require login. Profile setup is a separate public frontend-only preview and does not gate dashboard access.

## Pitch lifecycle

Generating an email is not evidence that the creator sent it. New generated pitches are drafts; the creator supplies an actual sent date when moving them to sent. Earlier `proposal_sent` records may have been generated but never sent, so do not silently interpret their creation date as a sent date.

**Why:** The older external API assigned `proposal_sent` at generation time; the revised September 2026 contract separates `generated` from `sent` and persists manual outreach and deal updates.

**How to apply:** Use backend state for pipeline and dashboard counts; preserve uncertain historical data instead of inventing sent dates or outcomes.

## Browser/API session transport

Keep browser calls to the external MAVLIT API on the app's own origin via the server-side proxy, including login, profile validation, pitches, and other account routes. A successful cross-origin CORS preflight is not evidence that the browser retained or sent an external session cookie.

**Why:** The Replit preview runs in an iframe, and browser cookie restrictions can leave a login response successful while subsequent external API requests return 401. The app-origin proxy gives the session a host-only, path-scoped, partitioned cookie. Switching transport requires signing in again; existing external-domain cookies are not reused.

**How to apply:** Route any new account API call through the same-origin proxy; do not reintroduce direct browser calls to the external host. Verify that login is followed by a successful cookie-backed profile read. Anonymous screenshot 401s are expected and cannot verify a signed-in flow.

## Frontend-only onboarding

Keep `/profile-setup` independent of authentication and the backend API. Draft and completed answers are stored only on the visitor's device; completing this preview does not update their account or unlock the dashboard.

**Why:** The user explicitly requested a frontend-only page. A forced server-completeness gate would strand users in a form that cannot update server state. The external API's September 2026 contract now supports creator age, gender, per-platform description modes, and generation; the frontend-only boundary is a product choice, not a missing API capability.

**How to apply:** Do not reintroduce API submission or auth gating on this page without a new request. Be clear in UI copy that local answers do not create a server profile.
