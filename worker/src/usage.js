// Monthly provider-search cap (default 250 = SerpApi free plan). 1 provider request = 1 search.
export async function reserveSearches(env, n) {
  if ((env.PROVIDER || "mock") === "mock") return { ok: true, used: 0, cap: 0 };
  if (!env.USAGE) return { ok: false, status: 503, error: "USAGE KV binding missing" };
  const cap = +(env.MONTHLY_SEARCH_CAP || 250), k = `searches:${new Date().toISOString().slice(0, 7)}`;
  const used = +(await env.USAGE.get(k)) || 0;
  if (used + n > cap) return { ok: false, status: 429, error: "Monthly search cap reached", used, cap };
  await env.USAGE.put(k, String(used + n), { expirationTtl: 60 * 60 * 24 * 62 });
  return { ok: true, used: used + n, cap };
}
export async function usageStatus(env) {
  const month = new Date().toISOString().slice(0, 7);
  return { month, used: env.USAGE ? +(await env.USAGE.get(`searches:${month}`)) || 0 : null, cap: +(env.MONTHLY_SEARCH_CAP || 250) };
}
