import { config } from "./config.js";
import { buildGrid } from "./grid.js";
import { getAdapter } from "./providers/index.js";
export { buildGrid };
const $ = id => document.getElementById(id);
function cls(rank) { return rank == null ? "t-miss" : rank <= 3 ? "t-top" : rank <= 10 ? "t-mid" : "t-low"; }
if (typeof document !== "undefined" && $("go")) {
  const adapter = getAdapter(config);
  $("source").textContent = adapter.isDemo ? "DEMO DATA: these ranks are made up to show the layout. They are not real Google Maps results." : `Source: ${adapter.label}`;
  $("source").className = adapter.isDemo ? "demo-banner" : "";
  $("go").onclick = async () => {
    const n = +$("n").value, g = buildGrid(+$("lat").value, +$("lng").value, n, +$("r").value);
    const results = await adapter.scan(g, $("kw").value, $("biz").value);
    const grid = $("grid"); grid.innerHTML = ""; grid.style.gridTemplateColumns = `repeat(${n}, 3rem)`;
    for (const r of results) { const d = document.createElement("div"); d.className = `tile ${cls(r.rank)}`;
      d.textContent = r.rank ?? "–"; d.title = `Row ${r.row + 1}, col ${r.col + 1}${r.demo ? " (demo)" : ""}`; grid.append(d); }
    const found = results.filter(r => r.rank != null), avg = found.length ? (found.reduce((s, r) => s + r.rank, 0) / found.length).toFixed(1) : "n/a";
    $("out").textContent = `${results.length} tiles for "${$("kw").value}" · average rank ${avg} · found in ${found.length}/${results.length}` + (adapter.isDemo ? " · DEMO DATA" : "");
  };
}
