# SDX STUDIO — developer website

Static site, no build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
cd ~/Desktop/sdx-studio-website
python3 -m http.server 8000   # then open http://localhost:8000
```

## Structure

```
index.html              All content (apps, workshop, craft, contact)
assets/css/style.css    Design tokens (dark default + light), layout, components
assets/js/main.js       Theme, reveals, galleries, and the live demos:
                        CheckMines board, LearnArabic letters, Fast Maths sprint
assets/img/brand/       Official SDX STUDIO logo (from the Play developer page) + favicons + OG image
assets/img/icons/       Official app icons from each Google Play listing
assets/img/shots/       Store screenshots (thumb/ = small copies for the hero strip)
```

## Keeping it accurate

Store figures (ratings, installs, "Updated" dates, versions) were read from Google Play on 28 Oct 2026.
They live in plain HTML: search `index.html` for `metrics` and `tile-meta` to update them, and the
`720` in the stats band is the sum of Play's install lower bounds (500 + 100 + 100 + 10 + 10).

## Deploying

Live on GitHub Pages from the `main` branch of github.com/rahilwani8090-cpu/sdx-studio.
Because the account's user site uses the custom domain snapdocx.in, GitHub serves this project at
https://snapdocx.in/sdx-studio/ — push to `main` and the site rebuilds within a minute.
If the address ever changes, update the absolute URLs in `index.html` (canonical, og:*), `robots.txt` and `sitemap.xml`.
