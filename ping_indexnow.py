"""Submit every URL in sitemap.xml to IndexNow (Bing, Yandex, DuckDuckGo, Ecosia, Yahoo).

Run after `python build_blog.py` and a deploy:
    python ping_indexnow.py

Google does NOT support IndexNow. For Google, submit the sitemap in Search Console
and use URL Inspection -> Request Indexing on new pages.
"""
import json, re, urllib.request, os

KEY = "58945e24d8c26f3e2e4f2047c8211870"
HOST = "relustt.site"
ENDPOINTS = ["https://api.indexnow.org/indexnow", "https://www.bing.com/indexnow"]
ROOT = os.path.dirname(os.path.abspath(__file__))

urls = re.findall(r"<loc>(.*?)</loc>", open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read())
if not urls:
    raise SystemExit("no <loc> entries in sitemap.xml")

payload = json.dumps({"host": HOST, "key": KEY,
                      "keyLocation": f"https://{HOST}/{KEY}.txt",
                      "urlList": urls}).encode()

for ep in ENDPOINTS:
    req = urllib.request.Request(ep, data=payload,
                                 headers={"Content-Type": "application/json; charset=utf-8"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"{ep} -> HTTP {r.status}")   # 200 or 202 means accepted
    except Exception as e:
        print(f"{ep} -> {e}")

print(f"\nsubmitted {len(urls)} URLs")
for u in urls:
    print("  " + u)
