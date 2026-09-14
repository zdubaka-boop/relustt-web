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

## Deploy

```bash
vercel --prod
```

The `.vercel/` directory holds the project link and is intentionally gitignored — run `vercel link` after cloning to reconnect.

## Known gaps

- Footer **Privacy Policy** and **Terms & Conditions** links are `href="#"` placeholders. The App Store listing requires a working privacy policy URL.
- Footer TikTok / Instagram / X icons are `href="#"` placeholders — handles not yet decided.

## SEO

`<head>` carries: keyword title, meta description, canonical, Open Graph + Twitter card, favicon links, and a JSON-LD `@graph` (Organization, WebSite, SoftwareApplication, FAQPage). The FAQPage schema is generated from the `<details>` blocks in the FAQ section — **if you edit an FAQ question or answer, update the JSON-LD to match**, otherwise Google flags the mismatch.

The site is a single page. Organic traffic needs content — see the plan in the repo issues / chat history: add a `/blog` repurposing the TikTok slide decks as articles.
