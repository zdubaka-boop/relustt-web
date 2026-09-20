# RELUSTT production launch plan

Prepared 2026-09-20. This is a plan, not a deployment authorization or a claim that live services have been verified.

**Status update, 2026-09-21:** the user authorized production deployment and it is complete. Both OAuth providers are enabled, production Stripe variables are configured, the webhook is enabled, and the live homepage records tracking. An unpaid Checkout smoke test passed and was expired. The remaining release checks below still apply, especially real provider/paid/iPhone flow, monitored support contact, policies, key rotation, app distribution and Supabase quota review. See `ACCESS_VERIFICATION_2026-09-21.md`; earlier statements about uncommitted/undeployed web work describe the prior checkpoint.

## Starting point

- The previous turn integrated remote commit `e8a5d16` into `funnel-question-rebuild` and passed all 23 Node tests.
- Local scorer, funnel-shell, landing-page and preview changes remain uncommitted.
- The README reports database migrations and the live Stripe monthly Price already exist. Recheck the connected services before modifying them; reuse the existing projects.
- Implemented pricing: $5 / $9 / $13 / $17.67 immediately for seven paid days, followed by $29.50 per month. The 90-day program is not a prepaid 90-day subscription.
- Update 2026-09-20: quiz tracking and purchased-answer handoff are implemented locally. Both tracking migrations are applied to Supabase and verified; web deployment and iOS compilation/device testing remain. Safe words and signatures remain memory-only. See `FUNNEL_TRACKING.md` and `SUPABASE_LOGIN_SETUP.md`.

## 1. Finalize the version to launch

Review the remaining local changes, settle which page serves `/`, and decide whether `obstacle-preview.html` belongs in the release. Check both quiz routes, price selection, and six archetypes. Commit the intended changes without secrets or temporary artifacts.

Before pushing, check which branch Vercel treats as Production so a Git push does not accidentally publish an unfinished release. Use a preview branch/deployment for the following checks.

Done when: one identifiable commit contains the intended site, and its deployment target is known.

## 2. Resolve customer-facing launch details

User decisions: provide a monitored support email and choose the web refund policy. Replace `example@gmail.com`; update Terms, Privacy, subscription disclosures and cancellation instructions to match actual behavior. Verify the retained testimonials before publishing them. The timer does not enforce a discount deadline, so its wording must reflect that.

The user requires the app to receive purchased quiz answers. The authenticated handoff is now implemented and its database is installed; verify it through a deployed test purchase, provider login and updated iOS build before launch. Never promise that the website has already enabled iPhone blocking.

Done when: offer, Stripe Checkout, support process and app onboarding describe the same purchase and experience.

## 3. Verify Supabase and configure login

Use the existing Supabase project `bnycfsujwbusxyeqnrhf`. Compare migration history with the repository before applying anything; do not reset the database. Verify subscription ownership/RLS using the transactional fixture tests.

Enable and configure Google and Apple login using the user's provider accounts. Register the Supabase provider callback, the web activation redirect and the app callback listed in README.md. Add the intended preview activation URL for testing as well.

Done when: both login providers return to the correct web/app destination, and account isolation checks pass.

## 4. Configure a Preview deployment with Stripe test mode

Use the existing Vercel project `rostweb`. Populate environment variables from `.env.example` in the correct environment. Keep secrets in secure configuration. Preview needs its own site URL, Stripe test key, test $29.50 monthly Price and test webhook signing secret. Keep test entitlements isolated from production users/app access.

Configure the funnel recurring Price; configure legacy monthly/yearly prices only if those checkout routes remain offered. Deploy the candidate commit to a stable preview URL, register its test webhook using the events in README.md, and redeploy if newly added environment values need to take effect.

Done when: preview checkout opens in Stripe test mode and signed webhook requests reach the deployed API.

## 5. Test the complete journey in test mode

Run the Node tests and browser flow checks against the candidate. Exercise both quiz paths and all four initial prices. Verify the amount charged immediately, the seven-day renewal date and the $29.50 monthly amount in Stripe's actual test Checkout.

Complete payment, deliberately choose a login, claim the purchase, and open the iOS build using the same identity. Verify activation refresh/retry, a different account's failed claim, duplicate webhooks, abandoned/failed payment, renewal, cancellation, and expiry. Confirm existing App Store customers retain access. Use test-mode time controls or controlled test fixtures for future billing events.

Done when: payment-to-app access and loss of access at the correct time work with deployed services, not only mocked tests.

## 6. Prepare the iOS release

Build and test the matching iOS changes on a real iPhone, including web-account sign-in, access refresh, existing RevenueCat purchases and Screen Time permission/blocking. Provide a working download destination and activation instructions. Complete the intended release/distribution process before sending general customers to a paid web funnel.

Done when: a paying customer can obtain the intended app build and use the purchased features.

## 7. Configure Production

After Preview passes, set Production environment values separately. Reuse the live monthly Price after checking its amount/currency/interval. Use a rotated Stripe API key if the previous key was exposed, and verify the statement descriptor and support details.

Register `https://relustt.site/api/stripe-webhook` for the documented checkout, subscription and invoice events, then store that endpoint's signing secret in Vercel Production. Verify the production domain and OAuth redirects. Stage the known candidate and identify the previous deployment for rollback.

Done when: production configuration is complete and the precise release is ready to publish. Do not use test-mode keys or prices in Production.

## 8. Publish and verify before sending traffic

Publish the verified commit when authorized. Complete a controlled real purchase with the user's explicit payment authorization; verify the actual initial charge, renewal details, successful webhook, account activation and app access. Handle cancellation/refund for that test only as authorized. Check logs and do not send paid traffic until this succeeds.

Done when: a real purchase completes the intended journey. During initial traffic, watch checkout errors, webhook failures, login failures and support messages. Roll back or pause acquisition if customers pay but cannot access the app.

## Ownership

- Assistant can prepare/review code, validate configuration, run tests and carry out authorized CLI/API setup.
- User supplies support/refund decisions, access to provider accounts where missing, secure credentials, iOS distribution access and authorization for real payments/public release.
- Immediate next action: Step 1, reviewing the remaining local changes and identifying the release commit.
