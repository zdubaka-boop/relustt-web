# RELUSTT quiz tracking and app handoff

## Reference and adaptation

Read-only reference: `https://github.com/netas369/solidgate_funnel_pwa_boilerplate_2026_08_02/tree/quiz-branch-`, commit `022352d2fb67666982b302a3699161c8d412478f`.

Reviewed its quiz-backend DATA_MODEL, CRO_TRACKING, EVENT_CATALOG, API_CONTRACT and KNOWN_RISKS documents. Adapted the separation of current sessions/event history, stable step IDs, immutable version labels, retry idempotency, backend result computation, and verified-account ownership. RELUSTT uses plain JS/Vercel functions and Stripe, so the reference's Next.js, Solidgate, Meta and PostHog implementation/configuration is not copied. No credentials or reference project identifiers are imported. Both downloaded reference repositories remain unmodified.

## What is implemented locally

| Data | Destination |
| --- | --- |
| Current answers, name, pathway, result, first/last campaign tags | `relustt_quiz_sessions` |
| Step views/exits/completions, answer-change markers, checkout clicks/cancellation/errors | `relustt_quiz_events` |
| Verified checkout creation, paid purchase, account activation | Same events table, server-generated |
| First successful app profile retrieval | Same events table, authenticated RPC |
| Frozen purchase-time answers and result, owned by an Auth UUID | `relustt_quiz_profiles` |
| 34 stable step labels, answer fields, phase/branch tags | `relustt_quiz_definitions` |
| Ingestion abuse limits using a daily address HMAC, never a raw IP | `relustt_quiz_rate_limits` |

Includes all currently asked quiz answers, commitment, chosen price and name. Does not save safe words, drawn signatures, raw keystrokes, auth credentials, payment card details, browsing history, full referrer URLs or raw IP addresses. Event rows contain answer field names; answer values live in the session/profile rather than every telemetry event. This implementation stores the latest answer choices, not a permanent copy of every superseded answer value.

Attribution tags are `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term`; session context also includes language, timezone, device category and referring hostname. Put campaign labels in tags, never personal data. No third-party ad pixel is enabled by this integration. The welcome notice and privacy description explain storage; they do not represent a marketing opt-in.

## Behavior and ownership

1. A browser tab creates a random journey ID plus a private random proof, retains them in session storage and begins sending bounded batches even if the visitor never answers.
2. The API allowlists every answer and event, computes the archetype using the same scorer as the UI, and stores the proof only as a hash. A random journey ID alone cannot overwrite or claim its answers.
3. SQL serializes updates by journey, ignores older answer snapshots, and deduplicates event IDs. A retry cannot inflate distinct-journey counts. Failed saves remain queued and retry with backoff; tab-close delivery is best effort, not guaranteed.
4. Before checkout the new client submits its current complete snapshot; a failed save blocks its redirect with a retryable error. Older clients and legacy checkout remain supported, but cannot retroactively recover quiz answers they never sent.
5. The payment claim stores a sanitized purchase snapshot and session ID. Only verified paid checkout state sets `paid_at`. Only the authenticated purchase claimant receives the profile. Linking runs inside the existing database claim transaction; emails are never ownership proof.
6. The iOS `WebAccessManager` calls `relustt_get_my_quiz()` after verifying access. RLS limits reads to the signed-in UUID. The published profile contains all saved answers; HomeView displays the saved name, archetype and focus. Account changes clear this memory and outstanding responses are identity-checked. Quiz data does not grant paid access or activate Screen Time blocking.

Checkout snapshots stay fixed when somebody returns to the browser and changes answers. Subsequent newer purchases can replace the same account's app profile. Direct visits to a result page remain distinguishable through missing step views and insufficient-evidence results.

## Apply to your Supabase project

**Applied on 2026-09-20:** both new migrations are installed in RELUSTT project `bnycfsujwbusxyeqnrhf`, with matching migration-history entries. Verified all five new tables have RLS, 34 step definitions exist, anonymous ingestion and authenticated analytics access are denied, and authenticated users can read their own profile through RLS. A live synthetic transaction verified event deduplication, rejection of invalid proofs and protection against stale snapshots, then rolled back all test records. **Updated 2026-09-21:** website tracking is deployed and verified writing to Supabase. The matching iOS quiz-profile code still requires Mac/device validation and distribution.

Supabase CLI authentication is saved in Windows Credential Manager for the local Windows account. Do not copy the token into project files or notes. The CLI token authorizes Management API operations; it is not a browser key or a substitute for the website's server environment variables.

Use existing project `bnycfsujwbusxyeqnrhf`. In **Supabase → SQL Editor**, first check that `purchase_claims`, `billing_subscriptions` and `sync_stripe_subscription` exist. The README says the earlier migrations were applied; verify history instead of re-running them blindly.

For a fresh environment, run these new files in order (do not rerun on the project above):

1. `supabase/migrations/202609200001_quiz_tracking.sql` — sessions, event log, account profiles, protected functions and reports.
2. `supabase/migrations/202609200002_quiz_catalog.sql` — RELUSTT's current 34 step definitions.

Alternatively, authenticate your Supabase CLI, link the existing project, inspect `supabase migration list --linked`, and apply only pending migrations with `supabase db push --linked`. This rollout used `supabase db query --linked --project-ref bnycfsujwbusxyeqnrhf --file ...` through the authenticated Management API, applying both new migrations and history entries in one transaction after checking the existing schema. Do not reset the remote database or copy the reference baseline.

Deploy the updated website API and browser files **after** the migrations. Configure `PUBLIC_SITE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` in the appropriate Vercel environment. Existing Stripe configuration is still required. New provider secrets belong in Supabase Auth, as explained in `SUPABASE_LOGIN_SETUP.md`.

Build and distribute the accompanying changes in sibling repository `unbound-price-blocking-backup`. A Windows environment cannot build/sign this iOS target; perform Xcode compilation and device verification on the Mac before release.

## Where to see the numbers

In **Supabase → Table Editor**, use the tables above for records. Use **SQL Editor** with `supabase/reports/funnel.sql` for:

- Viewed/completed/inactive journeys at each actual step, separated by branch.
- Archetype session-to-purchase and offer-to-purchase rates, plus activation and app-open counts.
- Answer distributions and purchase rates.
- Campaign/device/price performance.
- Actual forward transitions and paid users who have not activated.

The three `relustt_quiz_*_metrics` views are admin-only. Never make analytics public to build a dashboard. The reference's separate CRO web dashboard has not been transplanted; these queries run in your Supabase project.

Definitions: a session is a tab journey, not a deduplicated human. Start over creates another journey. Inactive/drop-off means the last viewed step is unfinished, no payment was recorded, and no save occurred for 30 minutes. It is not proof that somebody closed the page. Conditional steps are compared only against people who viewed them. Filter by cohort date, pathway and quiz version; incomplete cohorts can change as people return. Purchase counts come from verified initial payment, not total lifetime revenue or checkout-button clicks. Refund/lifetime-value reporting is outside these initial-conversion reports.

## Retention and rollout checks

Unclaimed browser proof expires after 30 days; expiry alone does not delete rows. Before launch choose retention periods and run scheduled cleanup under the project owner. Delete journey events by deleting their session (cascade); account deletion removes owned sessions and profiles. Payment claims retain their frozen snapshot unless explicitly cleared, so account erasure procedures must also clear those claim snapshots while retaining required billing records. Rate buckets should be pruned by `window_started`. No retention schedule is silently installed.

Local checks: `npm install`, then `npm test` (31 tests passed, including embedded PostgreSQL ownership/RLS tests). No local test uses live payments or production users. Browser verification confirmed answer/event persistence, reload continuity and no console errors against the disposable tracking preview. `npm run quiz:catalog` regenerates the local definition migration; create a new quiz version/migration after changing a published question/scoring contract.

Before launch verify: real deployed batch delivery, Supabase rows after a fresh quiz, all four test prices, payment plus Apple/Google activation, iOS fetch, account switching, and failures/retries. Static Python localhost cannot execute these Vercel API routes. `npm run preview:tracking` provides a temporary local in-memory PostgreSQL preview for tracking-only checks; data disappears when it stops and it cannot charge money.
