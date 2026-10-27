import { config } from "../app/config.js";
// Free 3x3 scan: try the live Worker first; on any service-side problem fall back to the FormSubmit email request
// (the form's normal action), so no request is ever lost. Only input problems are shown to the visitor.
const f = document.getElementById("scan"), msg = document.getElementById("msg"), $ = id => document.getElementById(id);
const api = config.scanApi || config.apiBase;
const paidSession = new URLSearchParams(location.search).get("paid");
let sample = { mode: "free" };
// Copy follows the live Worker state: "free" (default static copy) or "paid" ($1 sample scan, no free claim).
function paidCopy(checkout) {
  document.title = "$1 3×3 Google Maps rank scan – RankFootprint";
  const h = document.querySelector("main h1"); if (h) h.textContent = "$1 sample scan (3×3)";
  const cap = document.querySelector("figure.photo figcaption"); if (cap) cap.textContent = "Your $1 sample scan checks 9 points around your business.";
  document.querySelectorAll('a[href$="free-scan.html"]').forEach(a => { if (a.textContent.trim() === "Free scan") a.textContent = "$1 sample scan"; });
  const btn = f && f.querySelector("button");
  if (btn) btn.textContent = paidSession ? "Run my paid scan" : "Pay $1 and run my scan";
  if (msg) { msg.hidden = false; msg.textContent = paidSession ? "Payment received. Enter your details to run your scan."
    : "Free sample scans are used up for now, so the sample scan is $1 (paid securely through Stripe)."; }
  sample.checkout = checkout;
}
if (api) fetch(`${api}/api/sample-status`).then(r => r.json()).then(d => { sample = d; if (d.mode === "paid") paidCopy(d.checkout); }).catch(() => {});
function fallback() { msg.textContent = "Sending your request…"; HTMLFormElement.prototype.submit.call(f); }
if (f && api) f.addEventListener("submit", async e => {
  e.preventDefault();
  if ($("_honey") && $("_honey").value) return;
  if (sample.mode === "paid" && !paidSession && sample.checkout) { location.href = sample.checkout; return; }
  const btn = f.querySelector("button"); btn.disabled = true; msg.hidden = false;
  msg.textContent = "Scanning 9 points around your business… this takes about 30 seconds.";
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60000);
    const r = await fetch(`${api}/api/free-scan`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({ business: $("biz").value, location: $("loc").value, keyword: $("kw").value, email: $("em").value, ...(paidSession ? { paid_session: paidSession } : {}) }) });
    clearTimeout(t);
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.id) { // copy the lead to the owner's inbox via FormSubmit (best effort), then show results
      const fd = new FormData(f); fd.set("_subject", "RankFootprint free scan (instant, live)"); fd.set("results", `https://rankfootprint.com/results/?id=${d.id}`);
      try { await fetch(f.action.replace("formsubmit.co/", "formsubmit.co/ajax/"), { method: "POST", body: fd, headers: { Accept: "application/json" }, keepalive: true }); } catch {}
      location.href = `results/?id=${d.id}`; return; }
    if (r.status === 402 && d.checkout) { location.href = d.checkout; return; }
    if (r.status === 402 || r.status === 403) { msg.textContent = d.error || "Payment could not be verified."; btn.disabled = false; return; }
    if (r.status === 400 || r.status === 404) { msg.textContent = d.error || "Please check your details and try again."; btn.disabled = false; return; }
    fallback(); // 503 warming up, 429 budget/rate limit, 5xx: we'll run it by hand and email within 24 hours
  } catch { fallback(); }
});
