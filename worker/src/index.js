import { providers } from "./providers.js";
const json = (env, body, status = 200) => new Response(JSON.stringify(body), { status, headers: {
  "Content-Type": "application/json", "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (req.method === "OPTIONS") return json(env, {});
    if (pathname === "/api/health") {
      const month = new Date().toISOString().slice(0, 7);
      const used = env.USAGE ? +(await env.USAGE.get(`searches:${month}`)) || 0 : null;
      return json(env, { ok: true, provider: env.PROVIDER || "mock", month, used, cap: +(env.MONTHLY_SEARCH_CAP || 250) });
    }
    if (req.method !== "POST") return json(env, { error: "POST only" }, 405);
    let body; try { body = await req.json(); } catch { return json(env, { error: "Invalid JSON" }, 400); }

    if (pathname === "/api/scan") {
      const { points, query, target } = body;
      const max = +(env.MAX_GRID_POINTS || 81);
      if (!Array.isArray(points) || !points.length || points.length > max || !query || !target)
        return json(env, { error: `Need points (1-${max}), query, target` }, 400);
      const name = providers[env.PROVIDER] ? env.PROVIDER : "mock";
      const adapter = providers[name];
      if (name !== "mock") {
        const missing = name === "serpapi" && !env.SERPAPI_KEY ? "SERPAPI_KEY secret" : !env.USAGE ? "USAGE KV binding" : null;
        if (missing) return json(env, { error: `Live provider not configured (${missing})` }, 503);
        const cap = +(env.MONTHLY_SEARCH_CAP || 250), month = new Date().toISOString().slice(0, 7), k = `searches:${month}`;
        const used = +(await env.USAGE.get(k)) || 0;
        if (used + points.length > cap)
          return json(env, { error: "Monthly search cap reached", used, cap, requested: points.length }, 429);
        // Reserve before calling the provider so concurrent scans can't overshoot by much (KV is eventually consistent).
        await env.USAGE.put(k, String(used + points.length), { expirationTtl: 60 * 60 * 24 * 62 });
      }
      const results = [];
      for (const p of points) { // sequential: keeps within free-plan subrequest limits and provider rate limits
        try { results.push({ row: p.row, col: p.col, ...(await adapter.rankAt(env, p, query, target)) }); }
        catch { results.push({ row: p.row, col: p.col, rank: null, error: true }); }
      }
      return json(env, { provider: env.PROVIDER || "mock", demo: results.some(r => r.demo), results });
    }

    if (pathname === "/api/lead") {
      const { name, email, business, keyword, city, note, website } = body;
      if (website) return json(env, { ok: true }); // honeypot field
      if (!emailOk(email) || !business || !keyword) return json(env, { error: "Need email, business, keyword" }, 400);
      const lead = { name, email, business, keyword, city, note, at: new Date().toISOString() };
      if (env.LEADS) await env.LEADS.put(`lead:${lead.at}:${email}`, JSON.stringify(lead));
      // No email is sent from here yet; an email provider (e.g. Resend/Postmark) needs Joshua's approval.
      return json(env, { ok: true, stored: !!env.LEADS });
    }
    return json(env, { error: "Not found" }, 404);
  }
};
