# Creator profile save regressions

From the repository root:

```sh
pnpm --filter @workspace/mavlit test
pnpm --filter @workspace/mavlit typecheck:tests
```

For an individual suite or watch mode:

```sh
pnpm --filter @workspace/mavlit test -- tests/ProfileSettings.test.tsx
pnpm --filter @workspace/mavlit test:watch
```

No running server, account, cookies, environment secrets, or AI jobs are needed.
Vitest runs in jsdom with the real AuthProvider, profile form helpers,
ProfileSettings and API serialization. Every fetch is replaced by an in-memory
fixture; unexpected routes fail assertions even if application code catches the
request error. The fixture PUT **replaces** its stored object rather than merging.
Each render has its own QueryClient; storage and rendered trees are cleaned up
between tests.

Coverage:
- AuthContext fetches fresh data before PUT, preserving unknown server fields,
  nulls, arrays, existing preferences and values changed since mount.
- Preferences-only patches/saves change no other values, including deliberately
  noncanonical legacy values; empty or whitespace preferences send explicit null.
- The 1000-character boundary succeeds; a restored 1001-character draft disables
  Save and is rejected by the submit handler even when submitted programmatically.
- Failed reads or writes preserve auth state and the entire editor draft,
  including storage-backed remount recovery and successful retry.

The suite makes no production code changes and does not verify live backend
behavior. In particular it does not assume a preferences value changed on the
server will win over that same field explicitly sent by the editor.
