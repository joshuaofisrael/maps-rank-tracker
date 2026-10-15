# RankFootprint API Worker (not deployed)
Cloudflare Worker + D1 (users, magic-link sessions, scans, leads) + KV (monthly search cap). Free-tier sized.

Endpoints
- `GET /api/health`: provider + searches used this month / cap
- `POST /api/free-scan` `{business, location, keyword, email}`: locates the business (1 search) and runs a 3×3 grid (9), saves it, emails the share link (if email is enabled). Limits: 1 per email/day, 2 per IP/day, `FREE_SCANS_PER_DAY` overall
- `GET /api/results/:id`: public shareable result (128-bit random id)
- `POST /api/scan` (signed in): custom grid limited by plan (starter 5×5, growth 7×7, agency 9×9)
- `POST /api/auth/request` / `GET /api/auth/verify` / `GET /api/me` / `POST /api/auth/logout`: passwordless magic link
- `POST /api/billing/portal`: Stripe customer portal session. `POST /api/stripe/webhook`: plan sync (signature-verified)

Live provider: SerpApi, hard cap `MONTHLY_SEARCH_CAP=250`; missing key/KV/DB means 503, never a silent fallback. Email: Resend, off until `EMAIL_ENABLED="true"`.
Capacity note: 250 searches = about 25 free scans/month, OR ~10 Starter 5×5 scans. Paid plans need a paid data plan (DataForSEO ~$0.0006/point) before `paidOpen` goes true.

Deploy (needs Joshua's Cloudflare sign-in; run heavy steps under `flock /workspace/.locks/heavy-build.lock`, outside 14:00-19:45 weekdays)
1. `npx wrangler login`
2. `npx wrangler d1 create rankfootprint`, `npx wrangler kv namespace create USAGE`, paste ids into wrangler.toml, uncomment
3. `npx wrangler d1 execute rankfootprint --remote --file=schema.sql`
4. `npx wrangler secret put SERPAPI_KEY` (and later RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
5. `npx wrangler deploy`; add custom domain api.rankfootprint.com (requires the zone on Cloudflare) or use the workers.dev URL
6. Set `apiBase` in `app/config.js`, push; verify with a free scan
Local test harness used: /tmp/wt.mjs (fake D1 via sqlite, mocked SerpApi/Resend). All flows passed.
