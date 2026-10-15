import { providers } from "./providers.js";
const json = (env, body, status = 200) => new Response(JSON.stringify(body), { status, headers: {
  "Content-Type": "application/json", "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (req.method === "OPTIONS") return json(env, {});
    if (pathname === "/api/health") return json(env, { ok: true, provider: env.PROVIDER || "mock" });
    if (req.method !== "POST") return json(env, { error: "POST only" }, 405);
    let body; try { body = await req.json(); } catch { return json(env, { error: "Invalid JSON" }, 400); }

    if (pathname === "/api/scan") {
      const { points, query, target } = body;
      const max = +(env.MAX_GRID_POINTS || 81);
      if (!Array.isArray(points) || !points.length || points.length > max || !query || !target)
        return json(env, { error: `Need points (1-${max}), query, target` }, 400);
      const adapter = providers[env.PROVIDER] || providers.mock;
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
