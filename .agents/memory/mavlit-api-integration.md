---
name: MAVLIT API integration
description: External API authentication, pitch lifecycle, cookie transport, and creator onboarding boundary
---

# MAVLIT API Integration

## V1 complete-list contract

The user states that the external API no longer limits V1 matches: it returns all matched brands in one response.

**Why:** The user removed the API limit and clarified this after the frontend's pagination guard rejected an empty follow-up page.

**How to apply:** Treat the V1 response as the complete match list, not a page. Do not add limit/offset requests or infer additional pages from `total`, even if older API documentation still describes pagination.

## Match ranking ownership

Preserve the order of matches returned by the external API; do not re-sort them on the frontend.

**Why:** The user states the backend already returns the correct best-first display order. Displayed rounded percentages are not a replacement for that ranking.

**How to apply:** Keep backend ordering when updating match presentation, score breakdowns, or client-side filters.

## AI match ranking lifecycle

Only V3 should be available in the Matches UI; legacy V1 and V2 selections should lead to V3. Leave the external backend's ranking lifecycle unchanged.

**Why:** The user asked to remove both V2 and V1 from Matches, not to change the external backend.

**How to apply:** Do not restore V1/V2 tabs or activate their match requests from the Matches page. Matches should open directly to V3 without a version selector.

The external backend starts both V2 and V3 AI ranking when a creator profile is saved; the client should only request a re-rank when the creator explicitly clicks the re-rank control.

**Why:** The user specified that profile saves already trigger V2 and V3 ranking automatically. An extra frontend trigger would duplicate potentially expensive ranking work.

**How to apply:** Never sort results on the client. Keep known in-progress runs polling until final states while preserving previous results. Only expose V3 on the Matches page; backend V2 jobs are not a reason to restore a V2 UI.

## Brand exclusion semantics

Brand preferences are optional free text and affect V3 ranking only: wanted brands move up, unwanted brands move to the bottom but remain visible. This is distinct from the hard exclusions below.

**Why:** The user explicitly described preferences as a ranking signal, not a filter, and stated that V1/V2 do not use it.

**How to apply:** Display backend ranking order unchanged; never remove or reorder brands locally to simulate preferences.

The profile's "Brand categories to avoid" values are exact brand tags, not brand niches. The user states that the backend hard-filters out any brand carrying a selected tag.

**Why:** Rewriting a tag's spelling or replacing it with a broad niche changes which brands the creator excludes.

**How to apply:** Preserve API-provided tag strings in selections and saves. Each platform's tag suggestions must depend on that platform's own primary niches; do not silently discard existing exclusions when niches change.

## Auth model

Audience demographics are independent for Instagram and YouTube. Gender is `male`, `female`, `both`, or null when empty. Ages are optional integers 13–100, with minimum <= maximum when both exist. The old male/female percentage fields were removed and must never be included in profile PUTs, even if a legacy GET still returns them.

**Why:** The user supplied the external profile API contract and requested platform-specific profile editing.

**How to apply:** Do not infer gender from percentages or use shared legacy ages. Preserve all other fresh profile fields on replacement saves. Keep the creator's own required gender separate from optional audience gender.

Description generation produces the platform description and audience estimates together. The user also confirmed the backend now generates follower counts and sub-niches. The POST response contains only job status/ID, not generated values; poll GET at 1–2 seconds for the same job ID and read all generated values from the completed profile. Stop on failure or job replacement; null estimates remain empty.

**Why:** The user supplied this revised backend contract and explicitly said that generated values must never overwrite typed audience data.

**How to apply:** Apply this to both onboarding and profile editing. Persist the selected description mode using `generate`/`manual`. In generate mode, outputs are server-owned and read-only; populate all of them from the completed profile. In manual mode, preserve user-entered values when a previously started job finishes. No replacement PUT may run while either platform's generation is queued/running. Include all selected-platform audience fields from the current form in final saves, and reload with GET afterward rather than trusting the PUT response. Keep sign-in and Matches behavior unchanged; do not add client-side gender filtering or reintroduce V1/V2 pages from generic API instructions.

- Cookie-based JWT only — `credentials: "include"` on every request
- `POST /auth/login` → sets `access_token` httpOnly cookie; response body is full CreatorProfile
- `POST /auth/logout` → clears cookie
- `GET /creator-profile/me` — session validation on mount in AuthContext

Profile PUT is a full replacement, not a patch. Preserve the entire latest GET object and merge the edited fields before saving, including preferences during unrelated profile/username edits.

**Why:** The user clarified the full-replacement contract when adding brand preferences; omitted fields can be lost.

**How to apply:** Do not send partial profile objects directly to PUT or trigger extra AI refresh POSTs after saving; the backend queues V2 and then V3 itself.

## Route gate
- All app pages require login; an incomplete creator can only access creator onboarding until their account profile is saved with the required fields.

## Pitch lifecycle

The pitch review flow uses the existing generated pitch, not a separate unsaved-draft API. Review and edit on the Pitch page, then explicitly save edits. Do not promise that generation waits until Save to create the Pipeline entry.

**Why:** The user clarified that generation already creates the row and chose to extend same-row email editing rather than introduce separate generate/save endpoints. Saving email text must not mark outreach sent or change its sent date.

**How to apply:** Keep draft review separate from sending and update the original pitch rather than creating a duplicate. The user's streaming instructions supersede the earlier automatic Pipeline navigation: “Save changes” stays on the Pitch page, is disabled until edited, and confirms “Your changes were saved.” Pipeline navigation is separate.

Pitch generation must display real incoming server text live, not a simulated typewriter animation after completion. An empty read-only draft and writing status should appear immediately, including during the initial model-thinking delay. Only a completed server pitch becomes editable; failed or incomplete streams must not leave partial emails on screen.

**Why:** The user explicitly replaced wait-for-completion generation with live streaming, and authorized a local proxy transport change only because buffering prevented the frontend from receiving live chunks.

**How to apply:** Keep the external backend's generation and persistence logic unchanged. Preserve same-origin cookie authentication and streaming through the local proxy. Do not automatically retry interrupted generation with another creation request, since a completion may have been saved before the connection was lost.

Selecting a brand on the Pitch page should prefill its latest product in the optional product-launch reference. The creator can edit or clear it; never invent a product when the backend has none.

**Why:** The user explicitly requested an automatic starting value with manual editing retained.

**How to apply:** Use the selected brand's backend product information, including when arriving from a brand link. Switching brands must not carry over another brand's product reference.

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
