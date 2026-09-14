# Relustt — marketing site

Static landing page for **Relustt**, an iOS app for quitting porn.
Live: deployed on Vercel (project `rostweb`). Drives traffic to the App Store listing.

## Stack

Plain HTML/CSS/JS. No build step, no dependencies, no framework.

| File | Purpose |
|---|---|
| `index.html` | Entire page markup |
| `styles.css` | All styling |
| `script.js` | Starfield canvas, scroll reveal, stat counters, FAQ accordion |
| `phones/` | App screenshots used in device mockups |
| `trees/` | Progress-tree illustrations |
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
