# RankFootprint API Worker (not deployed)
Endpoints: `GET /api/health`, `POST /api/scan` `{points:[{row,col,lat,lng}], query, target}`, `POST /api/lead` `{name,email,business,keyword,city,note}`.
Live provider: **SerpApi** (`PROVIDER=serpapi`), hard cap `MONTHLY_SEARCH_CAP=250` searches/month (SerpApi free plan), counted per grid point in the `USAGE` KV namespace. A 3x3 scan uses 9; a 9x9 uses 81. Without `SERPAPI_KEY` or `USAGE` the scan endpoint returns 503 (no silent fallback). Set `PROVIDER=mock` for demo data.

Deploy later (needs Joshua's approval; Cloudflare free plan is enough):
1. `npx wrangler login`
2. `npx wrangler kv namespace create USAGE` (and `LEADS`), paste the ids into wrangler.toml and uncomment
3. `npx wrangler secret put SERPAPI_KEY` (from a free SerpApi account; never commit it), then `npx wrangler deploy` (wrap in the box heavy-build lock).
4. In `app/config.js` set `provider: "worker"` and `workerUrl` to the Worker URL.
Keys are only ever Worker secrets; never in the repo or the browser.
