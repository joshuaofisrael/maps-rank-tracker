import { config } from "../app/config.js";
// $1 3x3 sample scan: try the live Worker first; on any service-side problem fall back to the FormSubmit email request
// (the form's normal action), so no request is ever lost. Only input problems are shown to the visitor.
const f = document.getElementById("scan"), msg = document.getElementById("msg"), $ = id => document.getElementById(id);
const api = config.scanApi || config.apiBase;
const qs = new URLSearchParams(location.search), paidSession = qs.get("paid") || qs.get("session_id");
// Every sample scan costs $1 (static copy says so). Without a paid Stripe session, submitting sends the visitor to checkout.
let sample = { mode: "paid", checkout: "https://buy.stripe.com/8x28wQc2Abwt4xx2rSb3r1T" };
if (api) fetch(`${api}/api/sample-status`).then(r => r.json()).then(d => { if (d.checkout) sample = d; }).catch(() => {});
if (paidSession) { const btn = f && f.querySelector("button"); if (btn) btn.textContent = "Run my paid scan";
  if (msg) { msg.hidden = false; msg.textContent = "Payment received. Enter your details to run your scan."; } }
function fallback() { msg.textContent = "Sending your request…"; HTMLFormElement.prototype.submit.call(f); }
if (f && api) f.addEventListener("submit", async e => {
  e.preventDefault();
  if ($("_honey") && $("_honey").value) return;
  if (!paidSession) { location.href = sample.checkout; return; }
  const btn = f.querySelector("button"); btn.disabled = true; msg.hidden = false;
  msg.textContent = "Scanning 9 points around your business… this takes about 30 seconds.";
  try {
    const send = async () => { const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60000);
      const r = await fetch(`${api}/api/free-scan`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
        body: JSON.stringify({ business: $("biz").value, location: $("loc").value, keyword: $("kw").value, email: $("em").value, ...(paidSession ? { paid_session: paidSession } : {}) }) });
      clearTimeout(t); return [r, await r.json().catch(() => ({}))]; };
    let [r, d] = await send();
    // Paid return can beat Stripe's webhook: retry for ~30 seconds while the payment is still "pending".
    for (let i = 0; i < 10 && r.status === 402 && d.code === "payment_pending"; i++) {
      msg.textContent = "Confirming your $1 payment with Stripe…"; await new Promise(res => setTimeout(res, 3000)); [r, d] = await send(); }
    if (r.ok && d.id) { // copy the lead to the owner's inbox via FormSubmit (best effort), then show results
      const fd = new FormData(f); fd.set("_subject", "RankFootprint $1 sample scan (instant, live)"); fd.set("results", `https://rankfootprint.com/results/?id=${d.id}`);
      try { await fetch(f.action.replace("formsubmit.co/", "formsubmit.co/ajax/"), { method: "POST", body: fd, headers: { Accept: "application/json" }, keepalive: true }); } catch {}
      location.href = `results/?id=${d.id}`; return; }
    if (r.status === 402 && d.checkout && !paidSession) { location.href = d.checkout; return; }
    if (r.status === 402 || r.status === 403) { msg.textContent = d.error || "Payment could not be verified."; btn.disabled = false; return; }
    if (r.status === 400 || r.status === 404) { msg.textContent = d.error || "Please check your details and try again."; btn.disabled = false; return; }
    fallback(); // 503 warming up, 429 budget/rate limit, 5xx: we'll run it by hand and email within 24 hours
  } catch { fallback(); }
});
