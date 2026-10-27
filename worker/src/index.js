import { providers } from "./providers.js";
import { buildGrid } from "./grid.js";
import { json, cors, clean, emailOk, randomId, now } from "./util.js";
import { reserveSearches, usageStatus, sampleState } from "./usage.js";
import { sendEmail, scanResultEmail } from "./email.js";
import * as auth from "./auth.js";
import * as billing from "./stripe.js";

const PLAN_LIMITS = { free: 0, starter: 5, growth: 7, agency: 9 }; // max grid size per plan
const SITE = "https://rankfootprint.com";

function summarize(results) {
  const found = results.filter(r => r.rank != null);
  return { total: results.length, found: found.length, top3: found.filter(r => r.rank <= 3).length,
    avg: found.length ? +(found.reduce((s, r) => s + r.rank, 0) / found.length).toFixed(1) : null };
}
async function runGrid(env, adapter, points, query, target) {
  const out = [];
  for (const p of points) { // sequential: provider rate limits + Workers free-plan subrequest limit (50)
    try { out.push({ row: p.row, col: p.col, lat: p.lat, lng: p.lng, ...(await adapter.rankAt(env, p, query, target)) }); }
    catch { out.push({ row: p.row, col: p.col, lat: p.lat, lng: p.lng, rank: null, error: true }); }
  }
  return out;
}
async function freeScanAllowed(env, email, ip) {
  const day = new Date().toISOString().slice(0, 10), max = +(env.FREE_SCANS_PER_DAY || 20);
  const keys = [[`email:${email}`, 1], [`ip:${ip}`, +(env.FREE_SCANS_PER_IP_DAY || 1)], ["global", max]];
  for (const [k, lim] of keys) {
    const r = await env.DB.prepare("SELECT n,day FROM free_scan_limits WHERE k=?1").bind(k).first();
    if (r && r.day === day && r.n >= lim) return false;
  }
  for (const [k] of keys) await env.DB.prepare(`INSERT INTO free_scan_limits (k,n,day) VALUES (?1,1,?2)
    ON CONFLICT(k) DO UPDATE SET n = CASE WHEN day=?2 THEN n+1 ELSE 1 END, day=?2`).bind(k, day).run();
  return true;
}
async function saveScan(env, s) {
  await env.DB.prepare(`INSERT INTO scans (id,user_id,email,business,keyword,location,center_lat,center_lng,grid_size,radius_km,provider,demo,results,created_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)`).bind(s.id, s.user_id || null, s.email || null, s.business, s.keyword,
    s.location || null, s.center.lat, s.center.lng, s.grid_size, s.radius_km, s.provider, s.demo ? 1 : 0, JSON.stringify(s.results), s.created_at).run();
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, req) });
    const providerName = providers[env.PROVIDER] ? env.PROVIDER : "mock", adapter = providers[providerName];
    try {
      if (path === "/api/sample-status") { const st = await sampleState(env); delete st.serpapi_left; return json(env, req, st, 200, { "Cache-Control": "public, max-age=120" }); }
      if (path === "/api/health") return json(env, req, { ok: true, provider: providerName, ...(await usageStatus(env)) });

      // Public, shareable result (id is 128-bit random, unguessable).
      if (req.method === "GET" && path.startsWith("/api/results/")) {
        const id = path.split("/").pop();
        if (!/^[a-f0-9]{32}$/.test(id)) return json(env, req, { error: "Not found" }, 404);
        const r = await env.DB.prepare("SELECT id,business,keyword,location,center_lat,center_lng,grid_size,radius_km,provider,demo,results,created_at FROM scans WHERE id=?1").bind(id).first();
        if (!r) return json(env, req, { error: "Not found" }, 404);
        const results = JSON.parse(r.results);
        return json(env, req, { ...r, demo: !!r.demo, results, summary: summarize(results) }, 200, { "Cache-Control": "public, max-age=300" });
      }

      if (req.method === "GET" && path === "/api/auth/verify") {
        const cookie = await auth.verify(env, url.searchParams.get("token"));
        return new Response(null, { status: 302, headers: { Location: `${SITE}/account/${cookie ? "" : "?error=link"}`, ...(cookie ? { "Set-Cookie": cookie } : {}) } });
      }
      if (req.method === "GET" && path === "/api/me") {
        const u = await auth.currentUser(env, req);
        if (!u) return json(env, req, { signedIn: false });
        const scans = await env.DB.prepare("SELECT id,business,keyword,grid_size,created_at FROM scans WHERE user_id=?1 OR email=?2 ORDER BY created_at DESC LIMIT 50").bind(u.id, u.email).all();
        return json(env, req, { signedIn: true, email: u.email, plan: u.plan, maxGrid: PLAN_LIMITS[u.plan] ?? 0, scans: scans.results });
      }

      if (path === "/api/stripe/webhook" && req.method === "POST") {
        const payload = await req.text();
        if (!(await billing.verifyWebhook(env, payload, req.headers.get("Stripe-Signature")))) return new Response("bad signature", { status: 400 });
        await billing.applyEvent(env, JSON.parse(payload));
        return new Response("ok");
      }

      if (req.method !== "POST") return json(env, req, { error: "Not found" }, 404);
      let body; try { body = await req.json(); } catch { return json(env, req, { error: "Invalid JSON" }, 400); }

      // Free 3x3 scan: locate business (1 search) + 9 grid points = 10 searches against the monthly cap.
      if (path === "/api/free-scan") {
        const email = String(body.email || "").toLowerCase().trim(), business = clean(body.business), location = clean(body.location), keyword = clean(body.keyword, 80);
        if (body.website) return json(env, req, { ok: true }); // honeypot
        if (!emailOk(email) || !business || !location || !keyword) return json(env, req, { error: "Email, business, city/ZIP and search phrase are required" }, 400);
        const warming = { error: "Scan service warming up. Live scans start very soon.", code: "warming_up" };
        if (!env.DB || !env.USAGE) return json(env, req, warming, 503);
        if (providerName === "serpapi" && !env.SERPAPI_KEY) return json(env, req, warming, 503);
        const st = await sampleState(env);
        if (body.session_id && !body.paid_session) body.paid_session = body.session_id;
        if (body.paid_session) { // $1 sample scan: only after a verified, unused Stripe payment
          if (!st.paid_switch) return json(env, req, { error: "Paid sample scans are not switched on yet.", code: "paid_off" }, 403);
          const claim = await billing.claimSampleSession(env, String(body.paid_session));
          if (!claim.ok) return json(env, req, claim.pending
            ? { error: "We haven't received confirmation of this $1 payment yet.", code: "payment_pending" }
            : { error: "We couldn't verify an unused $1 payment for this scan.", code: "payment_unverified" }, 402);
          const cap = await reserveSearches(env, 10, "paid");
          if (!cap.ok) return json(env, req, { error: "Scan capacity is full this month. Reply to your receipt and we'll run it by hand or refund you.", code: "capacity" }, 429);
        } else {
          if (st.mode === "paid") return json(env, req, { error: "Free sample scans are used up. The sample scan is now $1.", code: "payment_required", checkout: st.checkout }, 402);
          if (!(await freeScanAllowed(env, email, req.headers.get("CF-Connecting-IP") || "unknown")))
            return json(env, req, { error: "Free scan limit reached for today. Try again tomorrow.", code: "rate_limited" }, 429);
          const cap = st.mode === "free" ? await reserveSearches(env, 10, "free") : { ok: false, status: 429 };
          if (!cap.ok) return json(env, req, cap.status === 429 ? { error: "This month's instant free scans are used up. We'll run yours by hand and email it.", code: "free_budget" } : warming, cap.status);
        }
        const place = await adapter.locate(env, business, location);
        if (!place) return json(env, req, { error: "We couldn't find that business on Google Maps. Check the name and city." }, 404);
        const results = await runGrid(env, adapter, buildGrid(place.lat, place.lng, 3, +(env.FREE_RADIUS_KM || 3)), keyword, place.place_id || place.title || business);
        const scan = { id: randomId(16), email, business: place.title || business, keyword, location, center: { lat: place.lat, lng: place.lng },
          grid_size: 3, radius_km: +(env.FREE_RADIUS_KM || 3), provider: providerName, demo: providerName === "mock", results, created_at: now() };
        await saveScan(env, scan);
        await env.DB.prepare("INSERT INTO leads (email,business,keyword,location,note,scan_id,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)")
          .bind(email, business, keyword, location, clean(body.note, 500), scan.id, scan.created_at).run();
        const shareUrl = `${SITE}/results/?id=${scan.id}`;
        scan.summary = summarize(results);
        const mail = await sendEmail(env, { to: email, ...scanResultEmail(scan, shareUrl) });
        return json(env, req, { ok: true, id: scan.id, url: shareUrl, demo: scan.demo, emailed: mail.sent, summary: scan.summary });
      }

      // Paid scans: signed-in users, grid size limited by plan.
      if (path === "/api/scan") {
        const u = await auth.currentUser(env, req);
        if (!u) return json(env, req, { error: "Sign in required" }, 401);
        const n = +body.grid_size, max = PLAN_LIMITS[u.plan] ?? 0;
        if (![3, 5, 7, 9].includes(n) || n > max) return json(env, req, { error: max ? `Your plan allows grids up to ${max}×${max}` : "Custom scans need a paid plan. Your free 3×3 scan is on the free scan page." }, 403);
        const lat = +body.lat, lng = +body.lng, radius = Math.min(Math.max(+body.radius_km || 3, 0.2), 40);
        const keyword = clean(body.keyword, 80), target = clean(body.target);
        if (!isFinite(lat) || !isFinite(lng) || !keyword || !target) return json(env, req, { error: "lat, lng, keyword, target required" }, 400);
        const cap = await reserveSearches(env, n * n, "paid");
        if (!cap.ok) return json(env, req, { error: cap.error, used: cap.used, cap: cap.cap }, cap.status);
        const results = await runGrid(env, adapter, buildGrid(lat, lng, n, radius), keyword, target);
        const scan = { id: randomId(16), user_id: u.id, business: target, keyword, center: { lat, lng }, grid_size: n, radius_km: radius,
          provider: providerName, demo: providerName === "mock", results, created_at: now() };
        await saveScan(env, scan);
        return json(env, req, { ok: true, id: scan.id, url: `${SITE}/results/?id=${scan.id}`, summary: summarize(results), results });
      }

      if (path === "/api/auth/request") { const r = await auth.requestLink(env, body.email); return json(env, req, r.body, r.status); }
      if (path === "/api/auth/logout") return json(env, req, { ok: true }, 200, { "Set-Cookie": await auth.logout(env, req) });
      if (path === "/api/billing/portal") {
        const u = await auth.currentUser(env, req);
        if (!u) return json(env, req, { error: "Sign in required" }, 401);
        const r = await billing.portalUrl(env, u);
        return json(env, req, r, r.url ? 200 : 400);
      }
      return json(env, req, { error: "Not found" }, 404);
    } catch (e) {
      console.error(e);
      return json(env, req, { error: "Server error" }, 500);
    }
  }
};
