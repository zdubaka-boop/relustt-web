# RELUSTT web checkout and account activation

The public RELUSTT site now sends customers through web checkout, then asks
them to connect the purchase to an Apple or Google login. The iOS app uses the
same Supabase identity and grants access when either the web subscription or
the existing RevenueCat/App Store entitlement is active.

Production site: https://relustt.site

Vercel project: `rostweb`

Supabase project: `bnycfsujwbusxyeqnrhf`

**2026-09-22 checkout update — source only, not deployed:** the funnel now has an
Oriano Moon-style, single-column payment page in RELUSTT violet/cyan, using
Stripe-hosted secure Elements. Read [CHECKOUT_HANDOFF.md](CHECKOUT_HANDOFF.md)
before deploying from another device. `STRIPE_PUBLISHABLE_KEY` is newly required
for this page; existing prices, webhook, claims, login and iOS access are preserved.
The September 21 production verification below predates this checkout redesign.

## Continue on another computer

The current website work is on **`funnel-question-rebuild`**, not `main`:

```sh
git clone --branch funnel-question-rebuild https://github.com/zdubaka-boop/relustt-web.git
cd relustt-web
npm ci
npm test
```

The matching quiz-profile iOS changes from `codex/web-quiz-profile-sync` are now integrated into `main` in
https://github.com/zdubaka-boop/unbound-price-blocking-backup.
Environment secrets, CLI login sessions, `.vercel/`, and Supabase's local link
are intentionally not committed. Authenticate on the new computer, relink the
existing Vercel project `rostweb` (project `prj_fUWXKVNpCmRl0QTqGoViEZq4Mv5X`,
team `team_qSVu5nbstIbzSpMbKDGquEnQ`), and link Supabase with
`supabase link --project-ref bnycfsujwbusxyeqnrhf`. Do not create replacement
projects or reset the remote database. Recreate secrets through secure
environment configuration; do not copy credentials from chat into source.

Handoff status, 2026-09-21: the website is deployed to production, both OAuth
providers are enabled, and production Stripe configuration and the webhook are
active. All 31 local Node checks and live transactional database isolation checks
passed. Live unpaid $5 Checkout creation and homepage telemetry were verified;
the Checkout session was expired without a charge. Actual provider account
creation, paid activation, and access in the matching iPhone build still need
end-to-end verification. See `ACCESS_VERIFICATION_2026-09-21.md` for evidence,
deployment identity and remaining limits; `CLOUD_HANDOFF.md` for continuation.

## Stack

Plain HTML/CSS/JS plus Vercel Node functions. No frontend compilation is needed.
Run `npm ci` to install the locked PGlite development dependency for SQL tests.

| File | Purpose |
|---|---|
| `index.html` | Homepage quiz entry, with the same tracking/scripts as `funnel.html` |
| `landing.html` | Preserved original marketing page |
| `styles.css` | All styling |
| `script.js` | Starfield canvas, scroll reveal, stat counters, FAQ accordion |
| `funnel.html` / `funnel.js` / `funnel.css` | Production onboarding funnel and personalized paywall |
| `animations/` | Original Lottie animation assets reused from the production iOS funnel |
| `vendor/lottie.min.js` | Local Lottie web renderer; no runtime CDN dependency |
| `checkout.html` / `checkout.js` | Legacy direct plan selection and Stripe Checkout handoff |
| `payment.html` / `payment.css` / `payment.js` | Custom funnel payment page using Stripe Checkout Elements |
| `api/checkout-details.js` | Cookie-protected checkout configuration; never puts client secrets in URLs |
| `activate.html` / `activate.js` | Post-purchase Apple/Google login and claim |
| `api/` | Checkout creation, purchase claiming, public config, Stripe webhook |
| `server/` | Server-only Supabase, Stripe, cookie, and request helpers |
| `supabase/migrations/` | RLS-protected subscription and purchase-claim schema |
| `phones/` | App screenshots used in device mockups |
| `trees/` | Progress-tree illustrations |
| `og.png` | 1200×630 social share image (OG / Twitter card) |
| `favicon.png`, `apple-touch-icon.png` | Icons, generated from `logo.png` |
| `robots.txt`, `sitemap.xml` | Crawl directives; sitemap lists the single page |
| `pages/src/*.md` | Standalone pages (About / Privacy / Terms) → `/about`, `/privacy`, `/terms` |
| `blog/src/*.md` | Blog posts — markdown with YAML front matter (title, slug, description, date, faq) |
| `build_blog.py` | Generates `blog/*.html`, `blog/index.html`, and rewrites `sitemap.xml` from `blog/src` |
| `blog.css` | Article layout; loads after `styles.css` and reuses its tokens/topbar/footer |
| `vercel.json` | `cleanUrls`, no trailing slash |

## Run locally

Static pages can be previewed with a local server, but checkout and login need
the linked Vercel environment:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000 for static layout only.

## Required configuration

Configure these variables in each environment where its checkout/login runs.
Use separate test-mode Stripe configuration in Preview/Development; only the
funnel Price is required for the quiz. Legacy monthly/yearly Price variables
are needed only for the separate direct-plan checkout:

```text
PUBLIC_SITE_URL
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_CHECKOUT_UI
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_MONTHLY
STRIPE_PRICE_YEARLY
STRIPE_PRICE_FUNNEL_MONTHLY
WEB_PLAN_MONTHLY_LABEL
WEB_PLAN_YEARLY_LABEL
```

`STRIPE_PUBLISHABLE_KEY` must be the public `pk_…` key for the **same Stripe
account and mode** as the secret key. Custom checkout is the funnel default;
`STRIPE_CHECKOUT_UI=hosted` restores the previous hosted checkout on redeployment.
It does not alter purchases or legacy direct plans. Do not deploy custom checkout
without configuring the matching publishable key. Keep all secret keys server-only.

The Stripe webhook endpoint is:

```text
https://relustt.site/api/stripe-webhook
```

Subscribe it to `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`customer.subscription.created`, `customer.subscription.updated`, and
`customer.subscription.deleted`, plus `invoice.paid`, `invoice.payment_failed`,
and `invoice.payment_action_required`. Use the endpoint's signing secret, not
the Stripe API key, for `STRIPE_WEBHOOK_SECRET`.

In Supabase Authentication → URL Configuration, add:

```text
https://relustt.site/activate*
relustt://auth/callback
```

Enable Google and Apple under Authentication → Providers. Both provider
consoles return through Supabase at:

```text
https://bnycfsujwbusxyeqnrhf.supabase.co/auth/v1/callback
```

Google needs its OAuth web Client ID and secret. Apple needs a Services ID,
Team ID, signing Key ID, and generated secret. The iOS App ID must keep the
Sign in with Apple capability enabled.

Apply the linked database migration before testing checkout:

```bash
supabase db push --linked
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, or
`STRIPE_WEBHOOK_SECRET` to browser code.

## Access rules

- Stripe purchase state is written only by server functions and verified
  webhooks.
- A short-lived, same-browser claim connects a completed checkout to the OAuth
  identity deliberately chosen after payment.
- Supabase RLS only lets a signed-in user read their own subscription rows.
- The iOS app unlocks for `active` or `trialing` web plans that have not expired.
- Existing App Store customers remain authorized by RevenueCat.
- Purchase ownership and billing changes share a service-role-only database
  transaction. A second account cannot take a claimed purchase, and webhooks
  cannot erase ownership. Webhooks retrieve Stripe's current state and older
  in-flight snapshots cannot replace newer ones.
- OAuth codes are explicitly exchanged before attaching a new purchase. Reloads
  can recover an already-connected purchase; a leftover login in a shared
  browser cannot silently receive a new purchase. Failed claims can be retried.
- The iOS app checks web access at launch, foregrounding, and every minute while
  active. Its identity-bound, in-memory access lease lasts at most five minutes
  (never past the billing expiry). No device-wide stored boolean grants access.
- First-time app users see the access screen after the splash, then can choose
  “I'm new — build my plan” to take native onboarding. The native funnel ends
  at the real RevenueCat offering, not its previous preview-only price choices.
  StoreKit/RevenueCat supplies the actual localized price and purchase terms.

### Verification and setup status (2026-09-21)

The correct Supabase project is linked. Both web subscription migrations were
applied without changing the existing community schema. The two earlier
community migrations in this repo were fetched from that project's history.

Run local checks with `npm ci` then `npm test`. Run transactional
database isolation checks with
`supabase db query --linked --project-ref bnycfsujwbusxyeqnrhf --file tests/subscription-access.sql`; its fixture
writes are rolled back and it never creates or modifies auth accounts.

Apple and Google providers and their web/app redirects are configured. Production
uses the verified active USD $29.50 monthly Price `price_1UHLIHE0Q5KzSNmvTXXSdrTF`.
Vercel stores the production Stripe key and signing secret as sensitive variables;
the subscription webhook is enabled. Preview still needs separate test-mode
configuration. Live unpaid $5 Checkout creation succeeded and was expired; no
charge, customer or subscription was created. Homepage tracking wrote one smoke
session and three events to Supabase, tagged `utm_source=deployment_verification`.

The current website deployment is `dpl_4HXwHD4D74JLDVoLdaiXfzm5KTP4`. Both tracking
migrations are applied. Actual provider account creation, paid activation and
matching iPhone access remain unverified. See the audit for precise evidence.
Rotate the chat-supplied live key before general release and replace placeholder
support/policy details. Do not confuse deployed code with a completed paid journey.

### Funnel billing: paid introductory week

The user confirmed on 2026-09-15: charge the selected `$5`, `$9`, `$13`, or
`$17.67` today for the first **7 days**, then **$29.50 every month** until
canceled. The 90-day plan is the program length, not a prepaid 90-day billing
period. The on-page seven-minute timer does not change these charges.

Set `STRIPE_PRICE_FUNNEL_MONTHLY` to an active USD **$29.50/month** Stripe Price
with interval count 1, per-unit billing, and licensed usage. Checkout retrieves
and verifies these fields before creating a session; a mismatched Price is
rejected. The old `STRIPE_PRICE_TIER_*` variables are no longer used by the funnel.
The separate legacy `/checkout` monthly/yearly plans keep their existing IDs.

The funnel Checkout Session combines a recurring line item with
`subscription_data.trial_period_days=7` and a **one-time, nonzero line item** for
the selected introductory amount. That one-time item is invoiced immediately;
only the recurring $29.50 charge is delayed. The introductory week is paid,
although Stripe internally reports the initial subscription status as `trialing`.
The API accepts only the four tier identifiers and determines amounts on the
server. Funnel promotion codes are disabled. Card payments are used with the
existing synchronous purchase activation flow.

Implementation references: [Stripe Checkout line items](https://docs.stripe.com/api/checkout/sessions/create)
and [combining trials with one-time items](https://docs.stripe.com/billing/subscriptions/trials?locale=en-GB).

Run `node --test tests/stripe-checkout.test.cjs` for isolated payload/configuration
checks. No real payment has been tested. Before launch, configure Stripe in test
mode and verify the selected amount due now, the renewal date and $29.50 monthly
amount, payment failure/cancellation, account activation, and iOS entitlement.
Set the account's statement descriptor to `RELUSTT` and replace the preview
contact/policy details with published support and subscription terms.

### Personalized final offer

Open `funnel.html?step=your-plan` (add `&path=performance` for that branch).
The page presents an answer-based archetype with an animated emblem,
the selected introductory offer, a blurred
preview, three existing site testimonials, FAQs, and return-to-offer buttons.
See [Quiz archetypes](FUNNEL_ARCHETYPES.md) for the six profiles, assignment
logic, copy decisions, and tests. The resolver is `funnel-archetypes.js`.

Answers and the name persist in session storage and are queued for the first-party
quiz API. The tracking migrations were applied on 2026-09-20; after web deployment, Supabase stores
journeys and conversion events; purchase activation links a frozen answer snapshot
to the Auth account for iOS retrieval. Safe words and signatures remain memory-only.
See [Tracking setup and reports](FUNNEL_TRACKING.md) and
[Apple/Google configuration](SUPABASE_LOGIN_SETUP.md). Website deployment and provider configuration are complete per the current handoff; the combined iOS source still needs signed-device verification and distribution. Local verification passed
31 tests and browser tracking checks; the live database smoke test passed with its
synthetic records rolled back.

The seven-minute display timer starts on the first offer visit, survives reload
in the same tab, shifts from green to red, and stays at `00:00`. Per the user's
decision, expiry does not change the price or disable checkout. It is not an
enforced discount deadline. Start over clears both quiz answers and the timer.

The roadmap is a planning framework, not a clinical recovery prediction. The
blurred passage is a visual teaser, not access-controlled content. No new review
claims were added; verify the provenance of the retained reviews before launch.
`example@gmail.com` remains the requested contact placeholder. The web refund
policy is awaiting the user's decision; the app's Apple-specific guarantee is
not automatically applied. The offer's subscription dialog uses the confirmed
web prices; the standalone Terms page still needs a complete web-billing review.
Privacy copy now describes the implemented browser storage and Stripe handoff.

Archetype checks: `node tests/funnel-archetypes.test.cjs`.
Browser regression scripts: `tests/funnel-flow.browser.js` and
`tests/funnel-offer.browser.js`. Run in a local same-origin browser using
`agent-browser eval --stdin`; they preserve and restore the tab's saved answers.

## Page sections

`index.html` is ordered: hero → pinned scroll reveal (animated stats) → testimonials → trees → benefits card → FAQ → final CTA.

Assets are cache-busted with a query string on the stylesheet link (`styles.css?v=15`) — bump that number when CSS changes, or Vercel's CDN will serve the old file.

## Blog

Posts live in `blog/src/*.md`. To add one: copy an existing file, change the front matter (`slug` becomes the URL: `/blog/<slug>`), write the body, put `{{cta}}` on its own line where the mid-article CTA box should appear, then:

```bash
python build_blog.py
```

That regenerates every post, the `/blog` index, and `sitemap.xml`. Needs `pip install markdown pyyaml`. Commit the generated HTML — Vercel serves it as static files, there is no build on their side.

After deploying a new post, tell the search engines:

```bash
python ping_indexnow.py
```

That submits every sitemap URL to IndexNow (Bing, Yandex, DuckDuckGo, Ecosia, Yahoo) — usually indexed within days. **Google does not support IndexNow**: submit the sitemap once in Search Console, then use URL Inspection → Request Indexing for each new post.

Each post gets Article + BreadcrumbList + FAQPage JSON-LD, canonical, OG tags, a mid-article CTA, an end CTA, and two "read next" links. Internal links between posts use `/blog/<slug>` paths.

Voice: blunt, warm, second person, concrete. No medical jargon, no invented statistics, no shame. Titles use the words people search ("porn", not "gooning").

## Deploy

```bash
vercel --prod
```

The `.vercel/` directory holds the project link and is intentionally
gitignored—run `vercel link` after cloning to reconnect.

## Known gaps

- Contact address on About / Privacy / Terms is a personal Gmail. Swap to a `@relustt.site` alias once mail forwarding is set up at GoDaddy.
- Privacy Policy describes the AI coach sending messages off-device and lists analytics/crash reporting. **Confirm this matches what the app actually does** before relying on it.
- Footer TikTok / Instagram / X icons are `href="#"` placeholders — handles not yet decided.
- Production Stripe variables, the webhook, Apple/Google providers and redirects are configured per `ACCESS_VERIFICATION_2026-09-21.md`. Their configuration and an unpaid Checkout smoke test are not proof of the complete paid/provider/iPhone journey.
- Separate test-mode Preview configuration, real end-to-end acceptance checks and the matching iOS distribution remain outstanding. Database migrations are already applied to `bnycfsujwbusxyeqnrhf`; do not reset or recreate them.

## SEO

`<head>` carries: keyword title, meta description, canonical, Open Graph + Twitter card, favicon links, and a JSON-LD `@graph` (Organization, WebSite, SoftwareApplication, FAQPage). The FAQPage schema is generated from the `<details>` blocks in the FAQ section — **if you edit an FAQ question or answer, update the JSON-LD to match**, otherwise Google flags the mismatch.

Organic content lives under `/blog`; regenerate it from `blog/src` with `build_blog.py` so the article pages, blog index, and sitemap stay synchronized.
