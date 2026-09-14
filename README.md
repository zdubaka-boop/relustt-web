# RELUSTT web checkout and account activation

The public RELUSTT site now sends customers through web checkout, then asks
them to connect the purchase to an Apple or Google login. The iOS app uses the
same Supabase identity and grants access when either the web subscription or
the existing RevenueCat/App Store entitlement is active.

Production site: https://relustt.site

Vercel project: `rostweb`

Supabase project: `bnycfsujwbusxyeqnrhf`

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
STRIPE_PRICE_TIER_5
STRIPE_PRICE_TIER_9
STRIPE_PRICE_TIER_1499
STRIPE_PRICE_TIER_2999
WEB_PLAN_MONTHLY_LABEL
WEB_PLAN_YEARLY_LABEL
```

The Stripe webhook endpoint is:

```text
https://relustt.site/api/stripe-webhook
```

Subscribe it to `checkout.session.completed`,
`customer.subscription.created`, `customer.subscription.updated`, and
`customer.subscription.deleted`.

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

The four funnel Price IDs correspond to the quarterly renewal choices shown on
the personalized paywall: `$5`, `$9`, `$14.99`, and `$29.99`. Funnel checkout
adds the advertised seven-day trial. Stripe remains the source of truth for
the recurring amount and interval.

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
- Funnel checkout cannot run until the four `STRIPE_PRICE_TIER_*` variables are supplied.
- Apple/Google login cannot run until both providers and redirect URLs are enabled in Supabase.
- The migration must be pushed to the linked Supabase project.

## SEO

`<head>` carries: keyword title, meta description, canonical, Open Graph + Twitter card, favicon links, and a JSON-LD `@graph` (Organization, WebSite, SoftwareApplication, FAQPage). The FAQPage schema is generated from the `<details>` blocks in the FAQ section — **if you edit an FAQ question or answer, update the JSON-LD to match**, otherwise Google flags the mismatch.

Organic content lives under `/blog`; regenerate it from `blog/src` with `build_blog.py` so the article pages, blog index, and sitemap stay synchronized.
