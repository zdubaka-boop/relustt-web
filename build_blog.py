"""Builds blog/*.html + blog/index.html from blog/src/*.md and rewrites sitemap.xml.

Run from the repo root:  python build_blog.py
Then deploy:             vercel --prod

Each post is a markdown file with YAML front matter (title, slug, description,
date, faq). Put {{cta}} on its own line where the mid-article CTA should go.
Outputs are committed, so the site stays a static deploy with no build on Vercel.
"""
import glob, html, io, json, os, re
import markdown, yaml

SITE = "https://relustt.site"
APP = "https://apps.apple.com/lt/app/quit-lust-relust/id6757361018"
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "blog", "src")
OUT = os.path.join(ROOT, "blog")
TODAY = "2026-09-14"

APPLE_SVG = ('<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" '
             'd="M16.5 1.5c.1 1.2-.4 2.3-1.1 3.1-.8.9-2 1.6-3.1 1.5-.1-1.2.5-2.4 1.2-3.1.8-.9 2.1-1.5 3-1.5zM20 '
             '17.3c-.5 1.2-.8 1.7-1.5 2.7-1 1.4-2.3 3.2-4 3.2-1.5 0-1.9-1-3.9-1-2 0-2.5 1-4 1-1.7 0-2.9-1.6-3.9-3-2.8'
             '-3.9-3.1-8.5-1.4-11 1.2-1.8 3.2-2.9 5-2.9 1.9 0 3.1 1 4.7 1 1.5 0 2.4-1 4.6-1 1.6 0 3.4.9 4.6 2.4-4 '
             '2.2-3.4 7.9.8 8.6z"/></svg>')

TOPBAR = f'''<header class="topbar">
  <div class="topbar__pill">
    <a class="brand" href="/" aria-label="Relustt home"><img class="brand__logo" src="/logo.png" alt="Relustt" /></a>
    <nav class="topnav">
      <a href="/blog">Blog</a>
      <a href="/#faq">Help</a>
      <a class="btn btn--light btn--sm" href="{APP}" target="_blank" rel="noopener">Start free</a>
    </nav>
  </div>
</header>'''

FOOTER = f'''<footer class="footer">
  <div class="footer__inner">
    <div class="footer__copy">© 2026 Relustt. All rights reserved.</div>
    <nav class="footer__nav">
      <a href="/">Home</a>
      <a href="/blog">Blog</a>
      <a href="/#faq">Help</a>
    </nav>
    <div class="footer__social">
      <a href="{APP}" target="_blank" rel="noopener" aria-label="App Store">{APPLE_SVG}</a>
    </div>
  </div>
</footer>'''

MID_CTA = f'''<aside class="cta-box">
  <p class="cta-box__kicker">The part most guys skip</p>
  <p class="cta-box__title">You can't out-willpower a phone that's always in your pocket.</p>
  <p>Relustt blocks adult sites and app feeds on-device, tracks every clean day, and gives you a Panic Button for the 90 seconds that decide a relapse.</p>
  <a class="btn btn--light" href="{APP}" target="_blank" rel="noopener">Get Relustt for iPhone {APPLE_SVG}</a>
</aside>'''

END_CTA = f'''<section class="endcta">
  <h2>Don't lose another year.</h2>
  <p>Every man who finally broke free wishes he'd started sooner. Blocker, Panic Button, and a 20-lesson brain rewire course — in one app.</p>
  <a class="btn btn--light" href="{APP}" target="_blank" rel="noopener">Download Relustt {APPLE_SVG}</a>
</section>'''


def head(title, desc, url, ld, og_title=None):
    return f'''<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#05060d" />
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="{url}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Relustt" />
<meta property="og:url" content="{url}" />
<meta property="og:title" content="{html.escape(og_title or title)}" />
<meta property="og:description" content="{html.escape(desc)}" />
<meta property="og:image" content="{SITE}/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{html.escape(og_title or title)}" />
<meta name="twitter:description" content="{html.escape(desc)}" />
<meta name="twitter:image" content="{SITE}/og.png" />
<link rel="icon" type="image/png" sizes="48x48" href="/favicon.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css?v=15" />
<link rel="stylesheet" href="/blog.css?v=1" />
<script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False, indent=1)}
</script>'''


def load_posts():
    posts = []
    for path in sorted(glob.glob(os.path.join(SRC, "*.md"))):
        raw = io.open(path, encoding="utf-8").read()
        m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
        meta = yaml.safe_load(m.group(1)); body = m.group(2)
        meta["body_md"] = body
        meta["words"] = len(re.findall(r"\w+", body))
        meta["minutes"] = max(1, round(meta["words"] / 220))
        meta["url"] = f"{SITE}/blog/{meta['slug']}"
        posts.append(meta)
    posts.sort(key=lambda p: (p["date"], p["slug"]), reverse=True)
    return posts


def render_post(p, all_posts):
    md = markdown.Markdown(extensions=["extra", "toc"])
    body_html = md.convert(p["body_md"].replace("{{cta}}", "\n\nCTA_MARKER\n\n"))
    body_html = body_html.replace("<p>CTA_MARKER</p>", MID_CTA)

    faq_html = ""
    if p.get("faq"):
        items = "".join(f"<details><summary>{html.escape(q['q'])}<i>+</i></summary><p>{html.escape(q['a'])}</p></details>"
                        for q in p["faq"])
        faq_html = f'<section class="post-faq"><h2>Common questions</h2>{items}</section>'

    related = [r for r in all_posts if r["slug"] != p["slug"]][:2]
    rel_html = "".join(f'<a class="related__card" href="/blog/{r["slug"]}"><span class="related__kicker">Read next</span>'
                       f'<span class="related__title">{html.escape(r["title"])}</span></a>' for r in related)

    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": p["url"] + "#article", "headline": p["title"], "description": p["description"],
         "datePublished": str(p["date"]), "dateModified": str(p.get("updated", p["date"])),
         "mainEntityOfPage": p["url"], "image": f"{SITE}/og.png",
         "author": {"@type": "Organization", "name": "Relustt", "url": SITE + "/"},
         "publisher": {"@type": "Organization", "name": "Relustt", "url": SITE + "/",
                       "logo": {"@type": "ImageObject", "url": f"{SITE}/apple-touch-icon.png"}}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Blog", "item": SITE + "/blog"},
            {"@type": "ListItem", "position": 3, "name": p["title"], "item": p["url"]}]},
    ]}
    if p.get("faq"):
        ld["@graph"].append({"@type": "FAQPage", "@id": p["url"] + "#faq", "mainEntity": [
            {"@type": "Question", "name": q["q"], "acceptedAnswer": {"@type": "Answer", "text": q["a"]}} for q in p["faq"]]})

    date_h = p["date"].strftime("%B %d, %Y") if hasattr(p["date"], "strftime") else str(p["date"])
    return f'''<!doctype html>
<html lang="en">
<head>
{head(p["title"] + " | Relustt", p["description"], p["url"], ld, p["title"])}
</head>
<body class="blog">
{TOPBAR}
<main class="post">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/blog">Blog</a></nav>
  <header class="post__head">
    <h1>{html.escape(p["title"])}</h1>
    <p class="post__meta">{date_h} · {p["minutes"]} min read</p>
  </header>
  <article class="post__body">
{body_html}
  </article>
  {faq_html}
  <section class="related">{rel_html}</section>
</main>
{END_CTA}
{FOOTER}
</body>
</html>
'''


def render_index(posts):
    cards = "".join(
        f'<a class="card" href="/blog/{p["slug"]}"><h2>{html.escape(p["title"])}</h2>'
        f'<p>{html.escape(p["description"])}</p><span class="card__meta">{p["minutes"]} min read</span></a>'
        for p in posts)
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Relustt Blog",
          "url": SITE + "/blog", "description": "Straight answers on quitting porn, recovery timelines, and staying quit.",
          "isPartOf": {"@type": "WebSite", "url": SITE + "/", "name": "Relustt"}}
    return f'''<!doctype html>
<html lang="en">
<head>
{head("Quit Porn Blog: Recovery Timelines, Relapse, and How to Actually Stop | Relustt",
      "Straight answers on quitting porn: what happens week by week, why you relapse, porn-induced ED, and the tools that make staying quit easier.",
      SITE + "/blog", ld, "Relustt Blog")}
</head>
<body class="blog">
{TOPBAR}
<main class="post">
  <header class="post__head">
    <h1>Straight answers on quitting porn.</h1>
    <p class="post__meta">No fluff, no shame. What actually happens when you stop, and how to stay stopped.</p>
  </header>
  <section class="cards">{cards}</section>
</main>
{END_CTA}
{FOOTER}
</body>
</html>
'''


def write_sitemap(posts):
    urls = [(SITE + "/", TODAY, "weekly", "1.0"), (SITE + "/blog", TODAY, "weekly", "0.8")]
    urls += [(p["url"], str(p.get("updated", p["date"])), "monthly", "0.7") for p in posts]
    body = "".join(f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{d}</lastmod>\n    <changefreq>{c}</changefreq>\n"
                   f"    <priority>{pr}</priority>\n  </url>\n" for u, d, c, pr in urls)
    io.open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "</urlset>\n")


if __name__ == "__main__":
    posts = load_posts()
    os.makedirs(OUT, exist_ok=True)
    for p in posts:
        io.open(os.path.join(OUT, p["slug"] + ".html"), "w", encoding="utf-8", newline="\n").write(render_post(p, posts))
        print(f"  {p['slug']}.html  ({p['words']} words)")
    io.open(os.path.join(OUT, "index.html"), "w", encoding="utf-8", newline="\n").write(render_index(posts))
    write_sitemap(posts)
    print(f"built {len(posts)} posts + index; sitemap.xml has {len(posts) + 2} urls")
