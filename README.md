# TileRank (working repo: maps-rank-tracker)
Google Maps grid rank tracker, v1 preview. Static site (no build step) served by GitHub Pages.
- `/` landing, `/pricing.html` ($19/$29/$49, no live payments), `/free-scan.html` (lead-capture design only, nothing sent or stored)
- `/app/` skeleton: grid builder + Places API (New) Text Search lookup. `app/config.js` holds an empty key; no key is provisioned. No scraping.
- Terms, Privacy, Disclaimer under Florida law; robots.txt allows all crawlers incl. AI bots; sitemap.xml; llms.txt.

- `/app/` uses a pluggable data adapter (`app/providers/`). Default is the mock adapter, clearly labelled DEMO DATA.
- `/worker/`: Cloudflare Worker skeleton (`/api/scan`, `/api/lead`), provider keys as Worker secrets. Not deployed.
- `/help/`: original help articles.

## IP note
All code, UI, copy, the TileRank name, logo (assets/logo.svg) and feature names (e.g. "TileMap") are original works created for Joshua Israel Ventures LLC, or properly licensed. No competitor source, screenshots, copy or trade dress was viewed or used.

© 2026 Joshua Israel Ventures LLC.
