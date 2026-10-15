# TileRank API Worker (not deployed)
Endpoints: `GET /api/health`, `POST /api/scan` `{points:[{row,col,lat,lng}], query, target}`, `POST /api/lead` `{name,email,business,keyword,city,note}`.
Default `PROVIDER=mock` returns results flagged `demo: true`.

Deploy later (needs Joshua's approval; Cloudflare free plan is enough):
1. `npx wrangler login`
2. `npx wrangler secret put DATAFORSEO_LOGIN` and `npx wrangler secret put DATAFORSEO_PASSWORD`
3. Set `PROVIDER = "dataforseo"` in wrangler.toml, then `npx wrangler deploy` (wrap in the box heavy-build lock).
4. In `app/config.js` set `provider: "worker"` and `workerUrl` to the Worker URL.
Keys are only ever Worker secrets; never in the repo or the browser.
