import { config } from "../app/config.js";
const $ = id => document.getElementById(id), api = p => `${config.apiBase}${p}`;
$("portal-login").href = config.portalLogin;
if (new URLSearchParams(location.search).get("error")) $("msg").textContent = "That sign-in link has expired or was already used. Request a new one.";
if (new URLSearchParams(location.search).get("checkout") === "success") $("msg").textContent = "Thanks for subscribing! Sign in with the same email to start scanning.";
async function load() {
  if (!config.apiBase) { $("msg").textContent ||= "Accounts open very soon."; return; }
  const me = await fetch(api("/api/me"), { credentials: "include" }).then(r => r.json()).catch(() => ({}));
  if (!me.signedIn) return;
  $("signed-out").hidden = true; $("signed-in").hidden = false; $("who").textContent = me.email; $("plan").textContent = me.plan;
  for (const s of me.scans) { const li = document.createElement("li"), a = document.createElement("a");
    a.href = `../results/?id=${s.id}`; a.textContent = `${s.business}: ${s.keyword} (${s.grid_size}×${s.grid_size}, ${new Date(s.created_at).toLocaleDateString()})`; li.append(a); $("scans").append(li); }
}
$("login").onsubmit = async e => {
  e.preventDefault();
  if (!config.apiBase) { $("msg").textContent = "Accounts open very soon."; return; }
  const r = await fetch(api("/api/auth/request"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: $("email").value }) });
  $("msg").textContent = r.ok ? "Check your inbox for a sign-in link (valid 15 minutes)." : "Please enter a valid email.";
};
$("portal").onclick = async () => {
  const r = await fetch(api("/api/billing/portal"), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
  const d = await r.json(); if (d.url) location.href = d.url; else $("msg").textContent = d.error;
};
$("logout").onclick = async () => { await fetch(api("/api/auth/logout"), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" }); location.reload(); };
load();
