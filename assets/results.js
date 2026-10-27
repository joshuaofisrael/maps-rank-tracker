import { config } from "../app/config.js";
const $ = id => document.getElementById(id), id = new URLSearchParams(location.search).get("id");
const cls = r => r == null ? "t-miss" : r <= 3 ? "t-top" : r <= 10 ? "t-mid" : "t-low";
$("copy").onclick = async () => { await navigator.clipboard.writeText(location.href); $("copied").textContent = "Link copied"; };
(async () => {
  if (!(config.scanApi || config.apiBase) || !/^[a-f0-9]{32}$/.test(id || "")) { $("meta").textContent = "No scan found. Run a $1 sample scan on the sample scan page."; return; }
  const r = await fetch(`${(config.scanApi || config.apiBase)}/api/results/${id}`);
  if (!r.ok) { $("meta").textContent = "This scan link isn't valid or has expired."; return; }
  const s = await r.json();
  $("title").textContent = `${s.business}: “${s.keyword}”`;
  $("meta").textContent = `${s.grid_size}×${s.grid_size} grid, ${s.radius_km} km radius · scanned ${new Date(s.created_at).toLocaleString()}`;
  $("demo").hidden = !s.demo;
  const g = $("grid"); g.style.gridTemplateColumns = `repeat(${s.grid_size}, 3rem)`;
  for (const p of s.results) { const d = document.createElement("div"); d.className = `tile ${cls(p.rank)}`; d.textContent = p.rank ?? "–";
    d.title = `Row ${p.row + 1}, col ${p.col + 1}`; g.append(d); }
  const t = s.summary;
  $("stats").textContent = `Found in ${t.found} of ${t.total} points (${Math.round(100 * t.found / t.total)}% coverage) · top 3 in ${t.top3} · average rank where found: ${t.avg ?? "n/a"}`;
})();
