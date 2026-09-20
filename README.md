# RELUSTT web checkout and account activation

The public RELUSTT site now sends customers through web checkout, then asks
them to connect the purchase to an Apple or Google login. The iOS app uses the
same Supabase identity and grants access when either the web subscription or
the existing RevenueCat/App Store entitlement is active.

Production site: https://relustt.site

Vercel project: `rostweb`

Supabase project: `bnycfsujwbusxyeqnrhf`

## Continue on another computer

The current website work is on **`funnel-question-rebuild`**, not `main`:

```sh
git clone --branch funnel-question-rebuild https://github.com/zdubaka-boop/relustt-web.git
cd relustt-web
node --test tests/*.test.cjs
```

The matching iOS changes are on `main` in
https://github.com/zdubaka-boop/unbound-price-blocking-backup.
Environment secrets, CLI login sessions, `.vercel/`, and Supabase's local link
are intentionally not committed. Authenticate on the new computer, relink the
existing Vercel project `rostweb` (project `prj_fUWXKVNpCmRl0QTqGoViEZq4Mv5X`,
team `team_qSVu5nbstIbzSpMbKDGquEnQ`), and link Supabase with
`supabase link --project-ref bnycfsujwbusxyeqnrhf`. Do not create replacement
projects or reset the remote database. Recreate secrets through secure
environment configuration; do not copy credentials from chat into source.

Handoff status, 2026-09-20: 23 local Node checks passed, database ownership/RLS
checks passed with fixture writes rolled back, and the iOS simulator build
passed. Code changes are not yet deployed or distributed. Apple/Google OAuth,
Vercel production environment configuration, the Stripe webhook, a rotated
Stripe API key, full payment-to-app verification, and iOS distribution remain.
Only CLI/API work is authorized; do not request computer-control access.

## Stack

Plain HTML/CSS/JS plus Vercel Node functions. There is no build step or npm
dependency installation.

| File | Purpose |
|---|---|
| `index.html` | Entire page markup |
| `styles.css` | All styling |
| `script.js` | Starfield canvas, scroll reveal, stat counters, FAQ accordion |
| `funnel.html` / `funnel.js` / `funnel.css` | Production onboarding funnel and personalized paywall |
| `animations/` | Original Lottie animation assets reused from the production iOS funnel |
| `vendor/lottie.min.js` | Local Lottie web renderer; no runtime CDN dependency |
| `checkout.html` / `checkout.js` | Legacy direct plan selection and Stripe Checkout handoff |
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

Vercel requires these variables in Development, Preview, and Production:

```text
PUBLIC_SITE_URL
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_MONTHLY
STRIPE_PRICE_YEARLY
STRIPE_PRICE_FUNNEL_MONTHLY
WEB_PLAN_MONTHLY_LABEL
WEB_PLAN_YEARLY_LABEL
```

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

### Verification and setup status (2026-09-19)

The correct Supabase project is linked. Both web subscription migrations were
applied without changing the existing community schema. The two earlier
community migrations in this repo were fetched from that project's history.

Run local API checks with `node --test tests/*.test.cjs`. Run transactional
database isolation checks with
`supabase db query --linked --file tests/subscription-access.sql`; its fixture
writes are rolled back and it never creates or modifies auth accounts.

Apple and Google providers were verified disabled and still require provider
configuration. The live `relustt` Stripe account now has product
`relustt_web_membership_v1` and monthly Price `price_1UHLIHE0Q5KzSNmvTXXSdrTF`.
Set that Price as `STRIPE_PRICE_FUNNEL_MONTHLY` in **Production only**. Test and
preview environments need their own test-mode key, Price, and webhook secret.
No customer, subscription, payment, or webhook endpoint was created during
product setup. `scripts/setup-stripe-funnel.cjs` checks for the existing Price
before creating anything, accepts a key through hidden input, and never saves it.

The later `--readiness` check confirmed live charges and payouts are enabled,
card payments are active, and Stripe reports no currently due, past-due, or
pending-verification requirements. No `relustt.site` webhook was configured.
Live Checkout amount checks were planned but not run before this handoff;
the passing checkout tests are isolated tests, not completed payments.

Vercel production configuration and complete OAuth/payment
round-trip testing remain pending. Do not treat mocked checkout tests as a
successful real purchase. Rotate any live secret pasted into a conversation,
then add it directly to the secure environment; never commit it.

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

Answers and the name persist in session storage in the same browser tab. The
intimacy-concern follow-up is now explicitly saved too. Answers are not stored
on the server or transferred to the iOS app; safe words and signatures remain
memory-only. Checkout sends only the selected tier and pathway.

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
- The live $29.50 monthly Price is created; checkout still needs its Vercel
  environment variables and webhook endpoint configured.
- Apple/Google login cannot run until both providers and redirect URLs are enabled in Supabase.
- Database migrations are applied to `bnycfsujwbusxyeqnrhf`; deployment and
  provider configuration still need to be completed before launching purchases.

## SEO

`<head>` carries: keyword title, meta description, canonical, Open Graph + Twitter card, favicon links, and a JSON-LD `@graph` (Organization, WebSite, SoftwareApplication, FAQPage). The FAQPage schema is generated from the `<details>` blocks in the FAQ section — **if you edit an FAQ question or answer, update the JSON-LD to match**, otherwise Google flags the mismatch.

Organic content lives under `/blog`; regenerate it from `blog/src` with `build_blog.py` so the article pages, blog index, and sitemap stay synchronized.
