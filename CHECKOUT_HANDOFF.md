# RELUSTT checkout — continue on another computer

Updated 2026-09-22. **Deployed and verified with real Stripe fields.** Production
deployment `dpl_32btNXN3BmSMY7ppWZcqFtLQuCFj` is published at https://relustt.site.
The matching production publishable key and `STRIPE_CHECKOUT_UI=custom` are
configured in Vercel. The September 21 checks predate this redesign.

## Wallet and copy follow-up — 2026-09-22

Latest correction: `if_required` still rendered the country selector in the live
Payment Element. Replaced only the card portion with standalone Stripe-hosted
`cardNumber`, `cardExpiry`, and `cardCvc` Elements. No country/address field is
collected or guessed. Stripe creates the PaymentMethod with the provided email;
Checkout confirms that method ID using its documented `paymentMethod` option.
Express Checkout remains on the same Session and existing verified activation
path. Three-field readiness, tokenization errors, duplicate submissions, and
amount changes during tokenization are handled. 40 tests and responsive mocked
browser checks passed. Live DOM/screenshot confirmed no country selector,
Apple Pay/Link buttons, loaded card fields, and no captured warnings/errors.
No real card was entered or payment completed; the full paid card/wallet and
3DS journeys remain unverified. This supersedes `if_required` below.

SDK references: https://docs.stripe.com/js/payment_methods/create_payment_method
and https://docs.stripe.com/js/custom_checkout/confirm.

Later user-directed simplification: removed both the compact billing sentence
and the “After payment, connect Apple or Google” footer from `/payment`.
Existing offer-page billing copy, terms links, amounts, schedule and activation
behavior are unchanged. Card billing address collection is now `if_required`:
Stripe may request a country/address only when required, rather than always
showing the country selector. This supersedes the compact-line UI described
below. Mock responsive checkout tests passed after these changes.

- Added Express Checkout with Apple Pay, Google Pay and Link. Custom Sessions now allow `card` and `link`; hosted rollback/legacy billing is unchanged.
- Registered `relustt.site` in live Stripe payment-method domains. Stripe reports Apple Pay, Google Pay and Link active. Previously only `checkout.stripe.com` was registered.
- Removed Stripe's repeated card mandate using its supported terms option. One compact line above both payment routes states the selected paid week price and $29.50 monthly renewal. The original long renewal sentence and redundant authorization sentence are gone.
- Link is enabled in the express row but disabled inside the Payment Element to avoid the duplicate optional email/phone/name signup form. Do not remove the express Link button when simplifying the card form.
- Wallet confirmation forwards Stripe's event through the same server-verified activation path. Wallets use their collected email; the external card-email field does not block wallet payments. Changed totals and concurrent submissions block both routes. Unsupported wallets leave the card form available.
- 40 unit/API tests and mocked responsive browser tests passed, including wallet confirmation failure/retry, duplicate prevention, changed amount rejection, and hidden unsupported-wallet UI. A live unpaid API Session accepted card/Link and was explicitly expired without a charge.
- Apple Pay and Link buttons rendered in the in-app browser. Google Pay is configured but was not offered in that environment. Completed wallet payment and Google Pay on an eligible browser still need verification. No payment was submitted.

References: https://docs.stripe.com/js/custom_checkout/create_express_checkout_element,
https://docs.stripe.com/js/custom_checkout/confirm,
https://docs.stripe.com/js/custom_checkout/create_payment_element.

## Deployment verification — 2026-09-22

- Reviewed latest upstream `4ff35ac` in isolated worktree `relustt-checkout-deploy`, preserving unrelated OTO drafts in the main local checkout.
- `npm ci` and all 40 automated tests passed. Mock browser checks passed at 320/390/768/1440 widths, including declined-payment retry, duplicate-submit prevention, amount changes and activation routing.
- Real production Stripe Elements rendered card/expiry/CVC/country fields on desktop and a fresh 390px mobile page, with the correct amount, renewal disclosure, enabled submit button and no JavaScript errors. No card data was entered and the payment button was not submitted.
- All four live tiers created owned custom Sessions and returned the expected 500/900/1300/1767 cents, seven paid days and 2950-cent monthly renewal configuration. Missing claim cookie returns 403; expired owned Session returns 410 and the page hides payment fields with a clear expiry message.
- Seven unpaid verification Sessions (one original hosted configuration probe and six custom-page probes) were explicitly expired. None created a customer, subscription or charge. Unclaimed records remain as smoke-test artifacts; they must not count as conversions.
- Production error-level log query returned no entries during the verification window. This is a bounded smoke check, not ongoing monitoring.
- Completed payment, 3DS, wallet eligibility, actual provider signup and iPhone entitlement remain unverified. Keep these acceptance checks separate from successful real-field rendering.

## Design and implementation

Reference: Oriano Moon's `/en/moon/checkout`, inspected live and in its source
and saved rendered screenshot. RELUSTT reproduces its centered 780px column,
letter-spaced brand, small accent, secure-payment heading, today's total, card
form, full-width CTA and payment badges, using violet/cyan instead of navy/gold.
No Oriano credentials, Solidgate integration, products or analytics were copied.

- `payment.html`, `payment.css`, `payment.js`: custom in-site checkout, mobile
  layout, loading, errors, retry and return-to-plan navigation.
- `api/create-checkout-session.js`: funnel plans now return `/payment?session_id=…`.
  The existing quiz follows that URL; its answers/tracking are unchanged.
- `server/stripe.js`: creates custom Checkout Sessions, with this request alone
  pinned to Stripe API `2025-03-31.basil`, as is the custom-page Session read.
  No account/webhook version change.
- `api/checkout-details.js`: verifies the HttpOnly purchase-claim cookie,
  expiry, Session ownership, status and amount before returning configuration.
  Responses are `no-store`; client secrets never enter URLs, storage or logs.
- Card/expiry/CVC fields are hosted by Stripe in its secure iframe. The website
  never collects card numbers itself. Email is passed to Stripe on confirmation.
- The displayed total comes from Stripe's Checkout object. A changed amount
  disables payment. Duplicate submissions are blocked; declines can be retried.
- Successful completion returns to the existing `/activate` Apple/Google
  connection screen. Only the server-verified payment/subscription claim unlocks
  access; a browser button or success URL does not grant an entitlement.

Billing stays **$5 / $9 / $13 / $17.67 for the first 7 days**, then **$29.50/month**.
The introductory week is paid. The same monthly Price and one-time intro line
item are used. Prices, schedules, tax behavior, webhooks, Supabase ownership,
OAuth and app access were not changed. The new page states the paid period
without the hosted page's confusing “7 days free” line-item label.

Legacy `/checkout` monthly/yearly plans still redirect to hosted Stripe Checkout.
The iOS app still uses Apple/RevenueCat, not this website payment form.

## Get the source

```sh
git clone --branch funnel-question-rebuild https://github.com/zdubaka-boop/relustt-web.git
cd relustt-web
npm ci
npm test
```

For an existing clone, preserve its edits, switch to this branch and run
`git pull --ff-only`. Website `main` is not the current funnel branch.

## Required configuration before you deploy

1. Keep the existing project, Stripe/Supabase accounts, monthly Price, webhook,
   claims schema and OAuth configuration. No new migration is needed.
2. Keep existing `PUBLIC_SITE_URL`, `STRIPE_SECRET_KEY`,
   `STRIPE_PRICE_FUNNEL_MONTHLY`, `STRIPE_WEBHOOK_SECRET` and Supabase variables.
3. **Add `STRIPE_PUBLISHABLE_KEY`**: the `pk_live_…` public key for the same
   Stripe account as the production secret key. Test environments need matching
   `pk_test_…`, `sk_test_…` and a test-mode $29.50 monthly Price. Never mix modes.
4. `STRIPE_CHECKOUT_UI=custom` is the default. An emergency rollback is
   `STRIPE_CHECKOUT_UI=hosted` plus redeployment. This affects newly created
   Sessions; existing custom Sessions retain their own payment page.
5. Deploy `payment.*`, the new API and the modified server code together.
   Missing public-key configuration fails closed before creating a payment.
6. Stripe.js loads directly from `https://js.stripe.com/clover/stripe.js`.
   If hosting adds a CSP, allow Stripe's documented script/iframe/connection
   origins; don't self-host the SDK. Register the payment domain in Stripe for
   wallets, and verify supported/unsupported devices rather than assuming support.

Secret keys, signing credentials and dashboard sessions are intentionally not
in Git. Configure them securely on the other device, never in source files.

## Verification and its limits

- `npm test`: 40 checks, covering existing billing/claims/webhook/RLS/tracking
  behavior and new checkout cookie, expiry, amount, compatibility and config cases.
- `tests/payment.browser.cjs`: 320/390/768/1440-width layout, no overflow,
  total/renewal copy, back route, decline/retry, duplicate submissions,
  changed-price refusal, expired/missing Sessions and activation routing.
- The real Clover Stripe.js initializer was checked to expose `initCheckout`.
- Browser payment tests use **mock Stripe fields/API responses**. They do not
  prove real Stripe rendering, 3DS, a charge, wallets or completed app activation.

To run browser checks with an existing Playwright installation:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright node tests/payment.browser.cjs
```

For an installed Chrome/Chromium binary, optionally set `PLAYWRIGHT_EXECUTABLE_PATH`
to its full executable path. This avoids requiring Playwright's downloaded browser.

Desktop/mobile mock screenshots are written to the OS temporary directory
(override with `CHECKOUT_SCREENSHOT_DIR`). No production APIs are contacted.

On the deploying device, first use separate Stripe test-mode configuration to
test all four amounts with real fields, success, 3DS, decline, reload, expiry and
back navigation. Verify Apple/Google linking, same-account app access and
cross-account rejection. After deployment, an unpaid production Session can
verify appearance without charging anyone. Do not make a real purchase without
explicit authorization. Real payment and wallet behavior remain unverified.

The earlier source-only checkpoint is superseded by the deployment verification above.
No completed purchase was performed.

References: [Stripe custom UI mode](https://docs.stripe.com/changelog/basil/2025-03-31/add-checkout-session-custom-ui-mode),
[Checkout total and confirmation](https://docs.stripe.com/js/custom_checkout/confirm),
[Elements styling](https://docs.stripe.com/elements/appearance-api).
