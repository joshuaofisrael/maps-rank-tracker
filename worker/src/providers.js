// Server-side rank-data adapters. Each: async rankAt(env, point, query, target) -> { rank, demo }
// `target` is matched against listing title (case-insensitive) or a place_id/cid if given.
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
function findRank(items, target) {
  const t = norm(target);
  const i = items.findIndex(x => [x.title, x.place_id, x.cid].some(v => v && (norm(v) === t || norm(v).includes(t))));
  return i < 0 ? null : i + 1;
}
export const providers = {
  mock: { async locate(env, business, location) { return { lat: 42.5653, lng: -83.3866, title: business, place_id: null, demo: true }; }, async rankAt(env, p, q, target) {
    let h = 0; for (const c of `${p.lat},${p.lng}|${q}|${target}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    h %= 100; return { rank: h < 12 ? null : 1 + (h % 20), demo: true };
  } },
  // DataForSEO Google Maps SERP API, Live mode (~$0.002/request). Use task_post (Standard, $0.0006) for scheduled scans.
  dataforseo: { async rankAt(env, p, q, target) {
    const res = await fetch("https://api.dataforseo.com/v3/serp/google/maps/live/advanced", { method: "POST",
      headers: { Authorization: "Basic " + btoa(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`), "Content-Type": "application/json" },
      body: JSON.stringify([{ keyword: q, location_coordinate: `${p.lat},${p.lng},15z`, language_code: "en", depth: 100 }]) });
    const items = (await res.json())?.tasks?.[0]?.result?.[0]?.items || [];
    return { rank: findRank(items.filter(i => i.type === "maps_search"), target), demo: false };
  } },
  serpapi: {
    // Find the business's coordinates and place_id (costs 1 search).
    async locate(env, business, location) {
      const u = new URL("https://serpapi.com/search.json");
      Object.entries({ engine: "google_maps", type: "search", q: `${business} ${location}`.trim(), api_key: env.SERPAPI_KEY }).forEach(([k, v]) => u.searchParams.set(k, v));
      const d = await (await fetch(u)).json();
      const r = d.place_results || (d.local_results || [])[0];
      if (!r?.gps_coordinates) return null;
      return { lat: r.gps_coordinates.latitude, lng: r.gps_coordinates.longitude, title: r.title, place_id: r.place_id || null, demo: false };
    },
    async rankAt(env, p, q, target) {
    const u = new URL("https://serpapi.com/search.json");
    Object.entries({ engine: "google_maps", type: "search", q, ll: `@${p.lat},${p.lng},15z`, api_key: env.SERPAPI_KEY }).forEach(([k, v]) => u.searchParams.set(k, v));
    const items = (await (await fetch(u)).json()).local_results || [];
    return { rank: findRank(items, target), demo: false };
  } },
  // Official Places API (New). Note: relevance order != Maps app order; approximate only.
  google_places: { async rankAt(env, p, q, target) {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env.GOOGLE_PLACES_KEY, "X-Goog-FieldMask": "places.id,places.displayName" },
      body: JSON.stringify({ textQuery: q, locationBias: { circle: { center: { latitude: p.lat, longitude: p.lng }, radius: 500 } } }) });
    const items = ((await res.json()).places || []).map(x => ({ place_id: x.id, title: x.displayName?.text }));
    return { rank: findRank(items, target), demo: false };
  } }
};
