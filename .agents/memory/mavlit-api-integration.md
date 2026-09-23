---
name: MAVLIT API integration
description: All pages in the MAVLIT frontend wired to api.mavlit.com; cookie-based JWT auth; key patterns per page
---

# MAVLIT API Integration

## Auth model
- Cookie-based JWT only — `credentials: "include"` on every request
- `POST /auth/login` → sets `access_token` httpOnly cookie; response body is full CreatorProfile
- `POST /auth/logout` → clears cookie
- `GET /creator-profile/me` — session validation on mount in AuthContext
- AuthContext (`artifacts/mavlit/src/contexts/AuthContext.tsx`) is the single source of truth for user state; caches to `mavlit_profile_cache` in localStorage as a loading fallback

## ProtectedRoute
- Defined in `App.tsx`; redirects to `/login` if no user, to `/profile-setup` if `isProfileComplete()` returns false
- `isProfileComplete()` = full_name + creator_handle + content_niche all non-null

## Shared API wrapper
- `artifacts/mavlit/src/lib/api.ts` — `api.get/post/put/delete` all targeting `https://api.mavlit.com`
- Exports response types: `DashboardStats`, `ApiPitch`, `SavedBrand`, `ApiBrand`, `RateIntelligenceResult`, `ContractAdviceResult`

## Page-by-page integration

### Dashboard (`artifacts/mavlit/src/pages/Dashboard.tsx`)
- `useQuery(["dashboard"])` → `GET /dashboard/me` for stat cards
- `useQuery(["pitches"])` → `GET /pitches/me` for "My Deals" section (shows first 3)

### Pitch (`artifacts/mavlit/src/pages/Pitch.tsx`)
- `generate()` → `POST /pitches` (non-streaming)
- `BRAND_NAME_TO_ID` maps matched brand names → integer IDs (sennheiser→1 … red-bull→6)
- API auto-saves pitch with `proposal_sent` status; no manual "mark as sent" needed
- After generation: "Pitch saved to your Pipeline automatically" + "View in Pipeline →" link

### Pipeline (`artifacts/mavlit/src/pages/Pipeline.tsx`)
- `useQuery(["pitches"])` → `GET /pitches/me` for primary pitch list
- API pitches get IDs prefixed `api-{id}`; manually-added pitches prefixed `pitch-`
- Local status overrides (conversation/closed) stored in `mavlit_pitch_overrides` localStorage key
- Falls back to `loadPitches()` demo data while API is loading

### BrandMatches (`artifacts/mavlit/src/pages/BrandMatches.tsx`)
- Saved brands from `useQuery(["saved-brands"])` → `GET /saved-brands/me`
- Toggle: `POST /saved-brands` with `{ brand_id }` or `DELETE /saved-brands/{brand_id}`
- Uses brand integer IDs (not brand names) — BRANDS array has `id: 1–6`
- Optimistic updates via `queryClient.setQueryData`; invalidates on API error

### BrandDetail (`artifacts/mavlit/src/pages/BrandDetail.tsx`)
- `SLUG_TO_BRAND_ID`: sennheiser→1, spotify→2, native-instruments→3, gopro→4, sweetwater→5, red-bull→6
- `useQuery(["brand", brandId])` → `GET /brands/{brand_id}` overlays: description, activityScore, lastPartnership, metaAdsActive, platformSignals, contact.email
- Match scores, reviews, deal ranges remain hardcoded (not in API)
- Same saved-brands API pattern as BrandMatches (shared `["saved-brands"]` query key)

### ProfileSetup (`artifacts/mavlit/src/pages/ProfileSetup.tsx`)
- `handleSave` calls `await updateProfile(...)` → `PUT /creator-profile/me`
- Only identity + niche fields (full_name, creator_handle, location_city, location_country, bio_tagline, content_niche)

### ProfileSettings (`artifacts/mavlit/src/pages/ProfileSettings.tsx`)
- Seeds form from `auth.user` on first load (via `seededRef` guard)
- `handleSave` calls `PUT /creator-profile/me` with identity + niche + sub_niches + audience_gender + audience_age_bracket
- Platform stats (followers, engagement rate, watch time) and rates remain in localStorage only — no API fields for those

### Negotiator (`artifacts/mavlit/src/pages/Negotiator.tsx`)
- Fixed: removed broken `import { useAuth } from "@workspace/replit-auth-web"` (package doesn't exist)
- Removed inline auth gate (ProtectedRoute in App.tsx handles authentication)
- Negotiator itself calls local API server `/api/negotiator/advise` (not api.mavlit.com)

**Why:** cookie-based auth; no bearer tokens; localStorage used only as cache/fallback, not as auth signal.

## External API CORS requirement

Direct server-to-server requests to `api.mavlit.com` work, but as of September 21, 2026 its responses do not include `Access-Control-Allow-Origin`, including for the public Brand Catalog endpoints.

**Why:** Browser requests from the Replit preview, localhost, `mavlit.com`, `www.mavlit.com`, and `app.mavlit.com` are blocked by CORS even though `curl` receives valid catalog data.

**How to apply:** Keep frontend URLs absolute as required, but do not treat `Failed to fetch` as a frontend regression until the external API enables the actual frontend origins and handles OPTIONS requests.

## Onboarding schema boundary

The live creator-profile API supports identity, location, content, platform handles, follower counts, niches, exclusions, and audience analytics, but not creator age, personal gender, or an explicit onboarding-complete field.

**Why:** The multi-step onboarding needs those inputs, but sending undocumented properties would not provide reliable server persistence.

**How to apply:** Save supported fields through the profile API. Keep unsupported onboarding-only fields in the completed local snapshot until the external API schema adds dedicated properties; profile completeness remains derived from required profile fields.
