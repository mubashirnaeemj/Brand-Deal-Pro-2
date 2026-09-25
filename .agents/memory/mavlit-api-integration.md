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

## External API CORS requirement

As of September 25, 2026, `api.mavlit.com` returns credentialed CORS headers for the published app and the current Replit development origin. The static screenshot tool uses `http://127.0.0.1`, which is not an allowed browser origin; that screenshot cannot verify authenticated pages.

**Why:** Earlier CORS observations predated the API configuration change; a localhost screenshot still reports a misleading CORS error even while real configured origins are allowed.

**How to apply:** Check CORS against the actual app origin and a credentialed browser session, not the screenshot tool's loopback origin.

## Frontend-only onboarding

Keep `/profile-setup` independent of authentication and the backend API. Draft and completed answers are stored only on the visitor's device; completing this preview does not update their account or unlock the dashboard.

**Why:** The user explicitly requested a frontend-only page. A forced server-completeness gate would strand users in a form that cannot update server state. The external API's September 2026 contract now supports creator age, gender, per-platform description modes, and generation; the frontend-only boundary is a product choice, not a missing API capability.

**How to apply:** Do not reintroduce API submission or auth gating on this page without a new request. Be clear in UI copy that local answers do not create a server profile.
