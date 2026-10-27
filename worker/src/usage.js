// Monthly provider-search budget (default 250 = SerpApi free plan). 1 provider request = 1 search.
// Keys (KV, per UTC month): searches:M = all searches, paid:M = searches used by paid scans, free:M = free scans run.
// Free scans may only use what is left after the paid reserve (PAID_RESERVE minus paid searches already used),
// so founding paid plans can always be fulfilled. See /workspace/maps-rank-tracker-outreach/fulfilment.md.
const month = () => new Date().toISOString().slice(0, 7);
const TTL = { expirationTtl: 60 * 60 * 24 * 62 };
async function num(env, k) { return +(await env.USAGE.get(k)) || 0; }

export async function reserveSearches(env, n, kind = "paid") {
  if ((env.PROVIDER || "mock") === "mock") return { ok: true, used: 0, cap: 0 };
  if (!env.USAGE) return { ok: false, status: 503, error: "USAGE KV binding missing" };
  const m = month(), cap = +(env.MONTHLY_SEARCH_CAP || 250);
  const used = await num(env, `searches:${m}`), paidUsed = await num(env, `paid:${m}`);
  if (kind === "free") {
    const reserve = Math.max(0, +(env.PAID_RESERVE || 0) - paidUsed);
    const freeRun = await num(env, `free:${m}`), freeMax = +(env.FREE_SCANS_PER_MONTH || 0);
    if (freeRun >= freeMax || used + n > cap - reserve) return { ok: false, status: 429, error: "Free scan budget for this month is used", used, cap };
    await env.USAGE.put(`free:${m}`, String(freeRun + 1), TTL);
  } else {
    if (used + n > cap) return { ok: false, status: 429, error: "Monthly search cap reached", used, cap };
    await env.USAGE.put(`paid:${m}`, String(paidUsed + n), TTL);
  }
  await env.USAGE.put(`searches:${m}`, String(used + n), TTL);
  return { ok: true, used: used + n, cap };
}
export async function usageStatus(env) {
  const m = month(), cap = +(env.MONTHLY_SEARCH_CAP || 250);
  if (!env.USAGE) return { month: m, used: null, cap };
  return { month: m, used: await num(env, `searches:${m}`), paid_used: await num(env, `paid:${m}`), free_scans: await num(env, `free:${m}`),
    free_scans_max: +(env.FREE_SCANS_PER_MONTH || 0), paid_reserve: +(env.PAID_RESERVE || 0), cap };
}

// Free-vs-$1 sample scan state. Free while the monthly free budget lasts AND live SerpApi credits stay above the floor
// (SAMPLE_FLOOR_PCT of the monthly quota, default 15%). Once free capacity is gone: "paid" if PAID_SAMPLE_ENABLED=true and
// Stripe verification is configured, otherwise "manual" (free scan queued for a hand-run, the pre-existing behaviour).
async function serpLeft(env) {
  if (!env.SERPAPI_KEY) return null;
  const c = await env.USAGE.get("serp_left"); if (c != null) return +c;
  try {
    const d = await fetch(`https://serpapi.com/account.json?api_key=${env.SERPAPI_KEY}`).then(r => r.json()); // free call, no credits
    const left = d.total_searches_left; if (typeof left !== "number") return null;
    await env.USAGE.put("serp_left", String(left), { expirationTtl: 900 }); return left;
  } catch { return null; }
}
export async function sampleState(env) {
  const m = month(), cap = +(env.MONTHLY_SEARCH_CAP || 250);
  const mock = (env.PROVIDER || "mock") === "mock";
  const used = env.USAGE ? await num(env, `searches:${m}`) : 0, paidUsed = env.USAGE ? await num(env, `paid:${m}`) : 0;
  const freeRun = env.USAGE ? await num(env, `free:${m}`) : 0, freeMax = +(env.FREE_SCANS_PER_MONTH || 0);
  const reserve = Math.max(0, +(env.PAID_RESERVE || 0) - paidUsed);
  const floor = Math.ceil(cap * (+(env.SAMPLE_FLOOR_PCT || 15)) / 100);
  const left = env.USAGE && !mock ? await serpLeft(env) : null;
  const freeOk = mock || (freeRun < freeMax && used + 10 <= cap - reserve && (left == null || left - 10 >= floor));
  const payReady = env.PAID_SAMPLE_ENABLED === "true" && !!env.STRIPE_SECRET_KEY && !!env.SAMPLE_PAYMENT_URL;
  const mode = freeOk ? "free" : payReady ? "paid" : "manual";
  return { mode, price_usd: mode === "paid" ? 1 : 0, checkout: mode === "paid" ? env.SAMPLE_PAYMENT_URL : null,
    free_scans_left: Math.max(0, freeMax - freeRun), serpapi_left: left, floor, paid_switch: payReady };
}
