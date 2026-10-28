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

## Store figures update automatically

`.github/workflows/deploy.yml` runs every 6 hours (and on every push). It runs
`.github/scripts/update_play_stats.py`, which reads the five public Google Play listings and rewrites
every element marked `data-play="<app>.<field>"` in `index.html`: installs, rating, version and
last-update date, plus the install total and the top-rating line in the stats band. If anything
changed it commits the new figures, then redeploys the site.

- Ratings are read with `gl=IN` because Play shows ratings per country. Apps without a rating show "New".
- If Play can't be reached or a value can't be read, the last good value in `assets/data/play-stats.json` is kept.
- Run it by hand any time: GitHub → Actions → "Deploy site" → "Run workflow", or `python3 .github/scripts/update_play_stats.py`.
- To track a new app, add it to `APPS` in the script and tag its figures in `index.html` the same way.

## Deploying

Live on GitHub Pages, deployed by the workflow above from github.com/rahilwani8090-cpu/sdx-studio.
Because the account's user site uses the custom domain snapdocx.in, GitHub serves this project at
https://snapdocx.in/sdx-studio/ — push to `main` and the site redeploys within a couple of minutes.
If the address ever changes, update the absolute URLs in `index.html` (canonical, og:*), `robots.txt` and `sitemap.xml`.
