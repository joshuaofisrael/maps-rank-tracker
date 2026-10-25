# RankFootprint (repo: maps-rank-tracker)
Google Maps grid rank tracker, v1 preview. Static site (no build step) served by GitHub Pages.
- `/` landing, `/pricing.html` ($19/$29/$49, no live payments), `/free-scan.html` (lead-capture design only, nothing sent or stored)
- `/app/` grid scan preview. Data comes from SerpApi (a third-party API that retrieves Google Maps results) via the Worker (, 250 searches/month cap); the browser never holds a key. Until the Worker is deployed the app shows labelled demo data.
- Terms, Privacy, Disclaimer under Florida law; robots.txt allows all crawlers incl. AI bots; sitemap.xml; llms.txt.

- `/app/` uses a pluggable data adapter (`app/providers/`). Default is the mock adapter, clearly labelled DEMO DATA.
- `/worker/`: Cloudflare Worker skeleton (`/api/scan`, `/api/lead`), provider keys as Worker secrets. Not deployed.
- `/help/`: original help articles.

## IP note
All code, UI, copy, the RankFootprint name, logo (assets/logo.svg) and feature names (e.g. "Footprint map") are original works created for Joshua Israel Ventures LLC, or properly licensed. No competitor source, screenshots, copy or trade dress was viewed or used.

© 2026 Joshua Israel Ventures LLC.

## SEO
- IndexNow key file at repo root (`<key>.txt`); ping script: `scripts/indexnow-ping.sh`.
- Organization JSON-LD: Joshua Israel Ventures LLC (publisher on every page).
