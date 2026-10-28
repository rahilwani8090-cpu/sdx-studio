#!/usr/bin/env python3
"""Refresh the Google Play figures shown on the site.

Reads each app's public Play listing and pulls out installs, rating, review count,
version and last-update date, then writes them into index.html wherever an element
carries data-play="<app>.<field>". A value that can't be read keeps its last good
value from assets/data/play-stats.json, so a Play layout change never blanks the site.

Standard library only. Run from anywhere: paths resolve from this file.
"""
import datetime as dt
import html as htmlmod
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "index.html"
STATE = ROOT / "assets" / "data" / "play-stats.json"

# Order is the order names appear in the "top rating" label.
APPS = {
    "tafseer": ("com.danishkhanday.ibnekaseer", "Tafseer Ibn Kaseer"),
    "habitflow": ("com.sdx.habitflow", "Habit Flow"),
    "snapdocx": ("com.suhail.imagerstools", "SnapDocx"),
    "checkmines": ("com.sdxstudio.checkmines", "CheckMines"),
    "kashmirmarket": ("com.dk.mykashmirmarket", "My Kashmir Market"),
}
# Play shows ratings per country, and these apps' audience is in India.
URL = "https://play.google.com/store/apps/details?id={pkg}&hl=en&gl=IN"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0 Safari/537.36"
FIELDS = ("installs", "rating", "reviews", "version", "updated")


def fetch(pkg):
    req = urllib.request.Request(URL.format(pkg=pkg), headers={"User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", "replace")
        except Exception as exc:  # network hiccup or a 5xx: back off and retry
            print(f"  fetch {pkg} attempt {attempt + 1} failed: {exc}")
            time.sleep(5 * (attempt + 1))
    return None


def parse_date(text):
    for fmt in ("%b %d, %Y", "%d %b %Y", "%B %d, %Y", "%d %B %Y"):
        try:
            d = dt.datetime.strptime(text.strip(), fmt)
            return f"{d:%b} {d.day}, {d.year}"
        except ValueError:
            pass
    return None


def parse(page, pkg):
    """Return the fields found on a listing page; anything not found is left out."""
    if f"details?id={pkg}" not in page:
        return {}
    out = {}
    m = re.search(r">([\d.,]+[KMB]?\+)</div><div[^>]*>Downloads<", page)
    if m:
        out["installs"] = m.group(1)
    m = re.search(r"Updated on</div><div[^>]*>([^<]+)<", page)
    if m and (d := parse_date(htmlmod.unescape(m.group(1)))):
        out["updated"] = d
    # The app's own rating sits in its starRating block. Other "Rated x stars" labels on the
    # page belong to the "More by SDX STUDIO" strip, so never fall back to those.
    m = re.search(r'itemprop="starRating".{0,400}?aria-label="Rated ([0-9.]+) stars', page, re.S)
    if m and 1 <= float(m.group(1)) <= 5:
        out["rating"] = f"{float(m.group(1)):.1f}"
        m = re.search(r'itemprop="starRating".{0,800}?>([\d.,]+[KMB]?) reviews?<', page, re.S)
        if m:
            out["reviews"] = m.group(1)
    m = re.search(r'"141":\[\[\["(\d+(?:\.\d+)+)"', page)
    if m:
        out["version"] = m.group(1)
    return out


def lower_bound(installs):
    m = re.fullmatch(r"([\d.,]+)([KMB]?)\+", installs or "")
    if not m:
        return 0
    return int(float(m.group(1).replace(",", "")) * {"": 1, "K": 1e3, "M": 1e6, "B": 1e9}[m.group(2)])


def join_names(names):
    return names[0] if len(names) == 1 else ", ".join(names[:-1]) + " and " + names[-1]


def render(doc, apps):
    total = sum(lower_bound(a.get("installs")) for a in apps.values())
    rated = [(float(apps[k]["rating"]), k) for k in APPS if apps.get(k, {}).get("rating")]
    top = max(r for r, _ in rated) if rated else None
    top_names = [APPS[k][1] for r, k in rated if r == top]

    def replace(m):
        tag, attrs, inner = m.group("tag"), m.group("attrs"), m.group("inner")
        key = re.search(r'data-play="([^"]+)"', attrs).group(1)
        fmt = re.search(r'data-format="([^"]+)"', attrs)
        fallback = re.search(r'data-fallback="([^"]*)"', attrs)
        fallback = fallback.group(1) if fallback else inner

        if key == "total.installs" and total:
            attrs = re.sub(r'data-count="[^"]*"', f'data-count="{total}"', attrs)
            inner = f"{total:,}"
        elif key == "top.rating" and top:
            attrs = re.sub(r'data-count="[^"]*"', f'data-count="{top:.1f}"', attrs)
            inner = f"{top:.1f}"
        elif key == "top.label" and top_names:
            inner = "store rating for " + join_names(top_names)
        else:
            app, _, field = key.partition(".")
            value = apps.get(app, {}).get(field)
            if field == "rating" and fmt:
                if fmt.group(1) == "dd":
                    inner = f'{value} <span class="star">★</span>' if value else fallback
                else:
                    inner = f"★ {value}" if value else fallback
            elif value:
                inner = htmlmod.escape(value)
        return f"<{tag}{attrs}>{inner}</{tag}>"

    return re.sub(r'<(?P<tag>[a-z0-9]+)(?P<attrs>\s[^>]*data-play="[^"]+"[^>]*)>(?P<inner>.*?)</(?P=tag)>',
                  replace, doc, flags=re.S)


def main():
    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
    old_apps = state.get("apps", {})
    apps, read_any = {}, False
    for key, (pkg, name) in APPS.items():
        page = fetch(pkg)
        found = parse(page, pkg) if page else {}
        read_any = read_any or bool(found)
        prev = old_apps.get(key, {})
        apps[key] = {f: found.get(f, prev.get(f)) for f in FIELDS if found.get(f, prev.get(f))}
        print(f"{name}: {found if found else 'could not read listing, keeping last values'}")
    if not read_any:
        print("warning: no listing could be read; site left unchanged")
        return 0

    doc = INDEX.read_text(encoding="utf-8")
    new_doc = render(doc, apps)
    if new_doc != doc:
        INDEX.write_text(new_doc, encoding="utf-8")
    if apps != old_apps:
        STATE.parent.mkdir(parents=True, exist_ok=True)
        STATE.write_text(json.dumps({
            "source": "Google Play listings (gl=IN)",
            "changed_on": dt.date.today().isoformat(),
            "apps": apps,
        }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("updated site" if new_doc != doc or apps != old_apps else "no changes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
