# Relustt — marketing site

Static landing page for **Relustt**, an iOS app for quitting porn.
**Live: https://relustt.site** — deployed on Vercel (project `rostweb`; the `rostweb.vercel.app` subdomain also resolves to the same deployment). Drives traffic to the App Store listing.

## Stack

Plain HTML/CSS/JS. No build step, no dependencies, no framework.

| File | Purpose |
|---|---|
| `index.html` | Entire page markup |
| `styles.css` | All styling |
| `script.js` | Starfield canvas, scroll reveal, stat counters, FAQ accordion |
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

Open `index.html` directly in a browser, or serve it:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000

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

The `.vercel/` directory holds the project link and is intentionally gitignored — run `vercel link` after cloning to reconnect.

## Known gaps

- Contact address on About / Privacy / Terms is a personal Gmail. Swap to a `@relustt.site` alias once mail forwarding is set up at GoDaddy.
- Privacy Policy describes the AI coach sending messages off-device and lists analytics/crash reporting. **Confirm this matches what the app actually does** before relying on it.
- Footer TikTok / Instagram / X icons are `href="#"` placeholders — handles not yet decided.

## SEO

`<head>` carries: keyword title, meta description, canonical, Open Graph + Twitter card, favicon links, and a JSON-LD `@graph` (Organization, WebSite, SoftwareApplication, FAQPage). The FAQPage schema is generated from the `<details>` blocks in the FAQ section — **if you edit an FAQ question or answer, update the JSON-LD to match**, otherwise Google flags the mismatch.

The site is a single page. Organic traffic needs content — see the plan in the repo issues / chat history: add a `/blog` repurposing the TikTok slide decks as articles.
