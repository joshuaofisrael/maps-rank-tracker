import { config } from "../app/config.js";
// Free 3x3 scan: try the live Worker first; on any service-side problem fall back to the FormSubmit email request
// (the form's normal action), so no request is ever lost. Only input problems are shown to the visitor.
const f = document.getElementById("scan"), msg = document.getElementById("msg"), $ = id => document.getElementById(id);
const api = config.scanApi || config.apiBase;
function fallback() { msg.textContent = "Sending your request…"; HTMLFormElement.prototype.submit.call(f); }
if (f && api) f.addEventListener("submit", async e => {
  e.preventDefault();
  if ($("_honey") && $("_honey").value) return;
  const btn = f.querySelector("button"); btn.disabled = true; msg.hidden = false;
  msg.textContent = "Scanning 9 points around your business… this takes about 30 seconds.";
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60000);
    const r = await fetch(`${api}/api/free-scan`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({ business: $("biz").value, location: $("loc").value, keyword: $("kw").value, email: $("em").value }) });
    clearTimeout(t);
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.id) { // copy the lead to the owner's inbox via FormSubmit (best effort), then show results
      const fd = new FormData(f); fd.set("_subject", "RankFootprint free scan (instant, live)"); fd.set("results", `https://rankfootprint.com/results/?id=${d.id}`);
      try { await fetch(f.action.replace("formsubmit.co/", "formsubmit.co/ajax/"), { method: "POST", body: fd, headers: { Accept: "application/json" }, keepalive: true }); } catch {}
      location.href = `results/?id=${d.id}`; return; }
    if (r.status === 400 || r.status === 404) { msg.textContent = d.error || "Please check your details and try again."; btn.disabled = false; return; }
    fallback(); // 503 warming up, 429 budget/rate limit, 5xx: we'll run it by hand and email within 24 hours
  } catch { fallback(); }
});
