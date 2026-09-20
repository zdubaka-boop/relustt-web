# Web purchase to iOS access verification

## Production deployment completed — 2026-09-21

User explicitly authorized production deployment. Current deployment `dpl_4HXwHD4D74JLDVoLdaiXfzm5KTP4` is READY and aliased to https://relustt.site. Immutable URL: https://rostweb-bihtm7ov1-zygis-projects-ce08d5fc.vercel.app. Built from the current local working tree; no GitHub push or commit was made.

Added `.vercelignore` to exclude local environment files, notes, tests, scripts, database files and a temporary `%SystemDrive%` directory from upload. Browser verification caught missing tracking script tags in the separate homepage `index.html`; aligned its scripts/cache versions with `funnel.html` and redeployed. Homepage tracking POST now returns 200, quiz navigation works, and browser JavaScript error collection is empty. A favicon.ico request returns 404 but does not prevent the quiz from working.

Live checks: homepage/funnel/activation/schema/tracking scripts return 200; unauthenticated claim returns 401; private report and `.env.local` return 404. A correctly signed invalid webhook payload passes signature validation and is rejected as an invalid event, confirming the deployed signing secret. Enabled Stripe endpoint `we_1UHtNXE0Q5KzSNmvCTLgxa1D` after this check.

Created one unpaid $5 Checkout session through the live API: HTTP 200, Stripe-hosted URL and claim cookie; Stripe reported USD 500 cents, unpaid, no customer/subscription created. Explicitly expired that session. No charge occurred. An unclaimed purchase-claim record from this smoke test remains for audit; the browser tracking smoke session uses `utm_source=deployment_verification` and should be excluded from conversion reporting. No recent error-level Vercel logs were returned during the brief post-deployment scan.

This supersedes earlier deployment/configuration blockers below. Remaining verification: actual provider account creation, paid checkout/claim/webhook delivery and access in the matching iPhone build. The legacy standalone monthly/yearly checkout still needs its separate price variables if it is used; the deployed quiz's four introductory tiers use the configured funnel monthly Price. No end-to-end paid/iPhone result is claimed.

## Historical pre-deployment checkpoints

The remaining sections preserve observations from earlier on 2026-09-21. The production-deployment section above supersedes the old 503, missing-variable, disabled-webhook and undeployed-code findings. End-to-end paid/iPhone verification is still outstanding.

## Later billing configuration update — 2026-09-21

The user supplied a restricted live Stripe key to continue setup. Verified it can retrieve the existing active USD $29.50/month Price `price_1UHLIHE0Q5KzSNmvTXXSdrTF` and access webhook management. Subscription retrieval for a deliberately nonexistent ID reached resource validation (404); a deliberately invalid Checkout mode reached validation (400). These are permission probes, not proof of a successful Checkout session or payment.

Saved and independently verified these variables in Vercel project `rostweb`, **production only**:

- `STRIPE_SECRET_KEY`: sensitive.
- `STRIPE_PRICE_FUNNEL_MONTHLY`: existing live monthly Price above.
- `STRIPE_WEBHOOK_SECRET`: sensitive, generated for the endpoint below.

Created webhook `we_1UHtNXE0Q5KzSNmvCTLgxa1D` at `https://relustt.site/api/stripe-webhook`, then disabled it pending deployment. Subscribed event types match the handler: checkout completed/async payment succeeded; subscription created/updated/deleted; invoice paid/payment failed/payment action required. Verified final status `disabled`. After deploying with these secrets and verifying the handler, enable this endpoint and verify deliveries. Do not create a duplicate endpoint or replace its signing secret blindly.

This supersedes the earlier statement that production project billing variables were absent. The current deployment was not replaced and cannot yet use these newly configured variables. Preview/development still have no test-mode billing setup. No checkout session, subscription, charge, deployment or GitHub push was created. No secret was written into repository files or Obsidian. Because the live key was supplied in chat, rotate it through Stripe and update the Vercel secret before launch.

Implementation references: [Vercel environment API](https://vercel.com/docs/rest-api/projects/create-one-or-more-environment-variables), [Stripe webhook creation](https://docs.stripe.com/api/webhook_endpoints/create), [Stripe webhook disable/update](https://docs.stripe.com/api/webhook_endpoints/update).

## Verified results

| Area | Evidence and result |
| --- | --- |
| Supabase providers | Live auth settings enable Apple and Google and allow signups. Authorization requests redirect to the expected providers with the Supabase callback. No actual provider login/code exchange or new account creation was completed. |
| Redirect configuration | Fixed Site URL from `http://localhost:3000` to `https://relustt.site`. Added `https://relustt.site/activate*` and `relustt://auth/callback` to the previously empty allowlist. Confirmed persisted values after browser reload. |
| Local tests | All 31 `npm test` checks passed, covering paid checkout payloads, claim ownership, unpaid purchase rejection, webhook signatures/replays, tracking snapshots, and database isolation. |
| Live entitlement database | `tests/subscription-access.sql` passed ownership, atomic claim, stale snapshot rejection, cancellation, RLS, and privileged-write checks in the actual Supabase project. All fixture writes rolled back. Final counts: zero purchase claims, billing subscriptions, and billing webhook events. |
| iOS source | `NutControl12/ContentView.swift` allows App Store subscription OR active web subscription. `Managers/WebAccessManager.swift` reads the signed-in user's entitlement from the same Supabase project and retrieves their saved quiz profile. Startup, foreground and periodic refresh are implemented. |
| Production checkout | Both `tier_5` and `monthly` checkout probes return HTTP 503: secure checkout is being connected. No purchase or charge was made. |
| Production tracking | `/api/funnel-events`, `/funnel-schema.js`, and `/funnel-tracking.js` return HTTP 404. Current tracking implementation is not deployed. |

## Required customer journey

1. Complete the quiz and purchase on the website.
2. On the website's post-purchase activation page, sign in with Apple or Google to create/use a Supabase account and attach the purchase and answers to it.
3. Download the app and sign in with the **same provider and account**.
4. The app reads that account's active entitlement and allows access without another purchase.

Payment alone does not automatically create a provider account. Skipping website activation and immediately signing into the app does not currently link the purchase. The claim uses same-browser proof with a 48-hour lifetime; email matching alone is intentionally insufficient. Apple private-relay and Google identities must not be assumed to be the same account.

An active/trialing entitlement must also have an unexpired period end. Cancellation-at-period-end, expiry, account switching and restoration need device-level acceptance testing. The 90-day roadmap is product content; current checkout tests cover seven paid days at the chosen price followed by $29.50/month.

## Production blockers and next actions

1. **Configure billing securely.** Vercel project `rostweb` currently lists Supabase/site/label environment variables but no `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or Stripe price variables. Prepare a test preview with matching Stripe test keys and prices. Configure and verify webhook delivery to that environment. Keep credentials out of notes, source control and chat output.
2. **Deploy the current web implementation to a test preview.** Add its exact activation destination to Supabase's redirect allowlist. Live `activate.js` and `funnel.js` differ from local. The old activation script already guards initial-page claims with `isOAuthCallback`; local code adds explicit PKCE exchange, retry and owner-only reload recovery. Deploy tracking APIs and scripts together.
3. **Complete real OAuth round trips and a test-mode purchase.** Test Apple and Google separately. Verify the Auth user, purchase owner, active entitlement and frozen quiz profile all share the intended UUID. Check failure/retry and canceled/unpaid sessions. No live charge is needed for these checks.
4. **Build and test the matching iOS source on a Mac/iPhone.** Confirm the paid web account reaches the app without a paywall, its quiz answers load, another account gets no access, sign-out clears access, and expiry/cancellation updates correctly. Windows source inspection cannot prove the downloadable App Store/TestFlight build contains these changes.
5. **Check Supabase service limits before launch.** Dashboard displays a grace-period/quota warning. APIs currently respond, but quota availability must be resolved/confirmed before paid traffic.
6. After acceptance, configure matching live billing settings and webhook delivery, release the verified app/web versions, and perform an explicitly authorized live smoke test.

## Evidence locations and provenance

- Web: `C:/Users/Bablikas/Documents/ChatGPT/my/relustt-web`, local HEAD `e8a5d16`, with existing uncommitted work.
- iOS: `C:/Users/Bablikas/Documents/ChatGPT/my/unbound-price-blocking-backup`, local HEAD `64c07ff`, with existing uncommitted work.
- Supabase project: `bnycfsujwbusxyeqnrhf`.
- Vercel production deployment inspected: `dpl_4eGvi7qoUZZ7piw3YcJaff2UYQ31`; metadata references commit `102a506fd5f34dbd5070fbc5c9406d76c045f791`, branch `main`, and a dirty working tree. Metadata is not proof of exact deployed source.
- Tests: `npm test`; `npx supabase db query --linked --project-ref bnycfsujwbusxyeqnrhf --file tests/subscription-access.sql`.
- Implementation: `activate.js`, `api/`, `server/`, `supabase/migrations/`, `FUNNEL_TRACKING.md`, `SUPABASE_LOGIN_SETUP.md`.

This audit changed Supabase login return settings only; no application code was changed, no deployment/push was performed, no customer account was created, and no purchase was made. No secrets are included here.
