# Profile and AI match regressions

From the repository root:

```sh
pnpm --filter @workspace/mavlit test
pnpm --filter @workspace/mavlit typecheck:tests
```

For an individual suite or watch mode:

```sh
pnpm --filter @workspace/mavlit test tests/ProfileSettings.test.tsx
pnpm --filter @workspace/mavlit test tests/useAiMatches.test.tsx tests/AiMatchesSection.test.tsx tests/BrandMatches.test.tsx
pnpm --filter @workspace/mavlit test:watch
```

No running server, account, cookies, environment secrets, or AI jobs are needed.
Vitest runs in jsdom with the real AuthProvider, profile form helpers,
ProfileSettings and API serialization. Every fetch is replaced by an in-memory
fixture; unexpected routes fail assertions even if application code catches the
request error. The fixture PUT **replaces** its stored object rather than merging.
Each render has its own QueryClient; storage and rendered trees are cleaned up
between tests.

## Creator profile saves

Coverage:
- AuthContext fetches fresh data before PUT, preserving unknown server fields,
  nulls, arrays, existing preferences and values changed since mount.
- Preferences-only patches/saves change no other values, including deliberately
  noncanonical legacy values; empty or whitespace preferences send explicit null.
- The 1000-character boundary succeeds; a restored 1001-character draft disables
  Save and is rejected by the submit handler even when submitted programmatically.
- Failed reads or writes preserve auth state and the entire editor draft,
  including storage-backed remount recovery and successful retry.

## AI match lifecycle

`useAiMatches.test.tsx`, `AiMatchesSection.test.tsx`, and `BrandMatches.test.tsx`
exercise the real hook, API response validation/serialization, section, and page.
The page suite also mounts the real profile editor, AuthProvider and router to
follow a successful save into V3. Only Navbar/Footer are omitted in that suite.

`fixtures/aiMatchesApi.ts` intercepts fetch and returns synthetic ranking responses.
It delegates profile reads/writes to the existing replacement-style profile
fixture. Unlisted routes (including V1) fail isolation assertions; requests never
fall through to a server. Even refresh POSTs are intercepted, so these tests
**cannot launch a live AI ranking**.

The hook and page suites use fake timers: three seconds and three minutes elapse
instantly. React Query observer notifications use microtasks during those suites
to avoid nested zero-delay timers adding a fake millisecond at timing boundaries.
The actual poll intervals and timeout timers remain unchanged; the notification
scheduler and real timers are restored after cleanup.

Coverage:
- A successful profile save opens V3 despite a stored V1 selection, reads the
  backend-queued ranking, and never submits an extra refresh POST.
- Plain Matches visits use V3; old V1/V2 links redirect to V3 without fetching
  those versions or restoring a version selector.
- Queued/running V3 jobs poll every 3 seconds, do not overlap slow requests,
  stop on completed/failed, and stop when the hook unmounts.
- Previous results remain rendered but dimmed, marked busy and explicitly
  described as non-final; final results remove that warning and busy state.
- The 3-minute deadline survives queued → running transitions, pauses GETs,
  and shows the paused-check message without implying the backend job stopped.
- Check status immediately resumes GET-only checks for a fresh 3-minute window,
  reuses slow in-flight reads, preserves non-final cards, and stops on completion,
  failure, or unmount. A second pause offers Check status again.
- Failure retry and completed manual refresh each send one POST and resume GET
  polling through completion. Pending POSTs and queued/running jobs reject
  further refresh actions.
- Backend array order is preserved even when confidence, numeric rank and names
  suggest different orders. Unwanted brands remain visible; searching and
  clearing search preserve backend order.
- V2 retains its separate cache, 5-second polling interval, legacy messages and
  controls, with no V3 timeout or preferences card. This tests legacy behavior
  without restoring V1/V2 in the Matches page.

The suites make no production code changes and do not verify live backend
behavior. In particular it does not assume a preferences value changed on the
server will win over that same field explicitly sent by the editor.
