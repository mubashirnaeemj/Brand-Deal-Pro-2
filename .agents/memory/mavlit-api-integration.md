---
name: MAVLIT API integration
description: External API authentication, pitch lifecycle, cookie transport, and creator onboarding boundary
---

# MAVLIT API Integration

## Auth model
- Cookie-based JWT only — `credentials: "include"` on every request
- `POST /auth/login` → sets `access_token` httpOnly cookie; response body is full CreatorProfile
- `POST /auth/logout` → clears cookie
- `GET /creator-profile/me` — session validation on mount in AuthContext

## Route gate
- All app pages require login; an incomplete creator can only access creator onboarding until their account profile is saved with the required fields.

## Pitch lifecycle

Generating an email is not evidence that the creator sent it. New generated pitches are drafts; the creator supplies an actual sent date when moving them to sent. Earlier `proposal_sent` records may have been generated but never sent, so do not silently interpret their creation date as a sent date.

**Why:** The older external API assigned `proposal_sent` at generation time; the revised September 2026 contract separates `generated` from `sent` and persists manual outreach and deal updates.

**How to apply:** Use backend state for pipeline and dashboard counts; preserve uncertain historical data instead of inventing sent dates or outcomes.

## Browser/API session transport

Keep browser calls to the external MAVLIT API on the app's own origin via the server-side proxy, including login, profile validation, pitches, and other account routes. A successful cross-origin CORS preflight is not evidence that the browser retained or sent an external session cookie.

**Why:** The Replit preview runs in an iframe, and browser cookie restrictions can leave a login response successful while subsequent external API requests return 401. The app-origin proxy gives the session a host-only, path-scoped, partitioned cookie. Switching transport requires signing in again; existing external-domain cookies are not reused.

**How to apply:** Route any new account API call through the same-origin proxy; do not reintroduce direct browser calls to the external host. Verify that login is followed by a successful cookie-backed profile read. Anonymous screenshot 401s are expected and cannot verify a signed-in flow.

## Onboarding boundary

Creator onboarding now gates access to the frontend. Local drafts persist per account on the device, but only a successfully saved account profile can unlock the app. The current external API has no authoritative `onboarding_completed` field, so the client derives status from persisted required fields until the backend supplies one.

**Why:** The user replaced the earlier frontend-only preview requirement with a mandatory login → profile → full-app flow. The remote FastAPI source is not present in this workspace; a frontend gate alone does not secure the external API against direct requests.

**How to apply:** Keep route checks based on validated server profile data, not local draft flags. Once the backend can change, make completion authoritative in its profile responses and enforce it on creator-facing endpoints. Do not equate editing a draft with submitting a profile.
