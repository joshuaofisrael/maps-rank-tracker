import { config } from "./config.js";
// Build an n x n grid of lat/lng points spanning `radiusKm` around a centre.
export function buildGrid(lat, lng, n, radiusKm) {
  const pts = [], step = n > 1 ? (2 * radiusKm) / (n - 1) : 0;
  const dLat = km => km / 111.32, dLng = km => km / (111.32 * Math.cos(lat * Math.PI / 180));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const north = radiusKm - r * step, east = -radiusKm + c * step;
    pts.push({ row: r, col: c, lat: +(lat + dLat(north)).toFixed(6), lng: +(lng + dLng(east)).toFixed(6) });
  }
  return pts;
}
// Rank of `placeId` in an official Places API Text Search biased to one point. Runs only with a configured key.
export async function rankAt(point, query, placeId) {
  if (!config.PLACES_API_KEY) throw new Error("No API key configured");
  const res = await fetch(config.endpoint, { method: "POST", headers: { "Content-Type": "application/json",
    "X-Goog-Api-Key": config.PLACES_API_KEY, "X-Goog-FieldMask": "places.id" },
    body: JSON.stringify({ textQuery: query, locationBias: { circle: { center: { latitude: point.lat, longitude: point.lng }, radius: 500 } } }) });
  const ids = ((await res.json()).places || []).map(p => p.id), i = ids.indexOf(placeId);
  return i < 0 ? null : i + 1;
}
const $ = id => document.getElementById(id);
if (typeof document !== "undefined" && $("go")) $("go").onclick = () => {
  const g = buildGrid(+$("lat").value, +$("lng").value, +$("n").value, +$("r").value);
  $("out").textContent = `${g.length} points for "${$("kw").value}"` + (config.PLACES_API_KEY ? "" : " (no API key: lookups disabled)") + "\n" + g.map(p => `[${p.row},${p.col}] ${p.lat}, ${p.lng}`).join("\n");
};
