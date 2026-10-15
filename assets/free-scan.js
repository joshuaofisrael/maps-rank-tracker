import { config } from "../app/config.js";
const f = document.getElementById("scan"), msg = document.getElementById("msg"), $ = id => document.getElementById(id);
f.addEventListener("submit", async e => {
  e.preventDefault();
  msg.hidden = false;
  if (!config.apiBase) { msg.textContent = "Free scans open very soon. Nothing was sent or stored. Please check back shortly."; return; }
  const btn = f.querySelector("button"); btn.disabled = true; msg.textContent = "Scanning 9 points around your business… this takes about 30 seconds.";
  try {
    const r = await fetch(`${config.apiBase}/api/free-scan`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business: $("biz").value, location: $("loc").value, keyword: $("kw").value, email: $("em").value, website: $("website").value }) });
    const d = await r.json();
    if (!r.ok) { msg.textContent = d.error || "Something went wrong. Please try again."; btn.disabled = false; return; }
    location.href = `results/?id=${d.id}`;
  } catch { msg.textContent = "Network error. Please try again."; btn.disabled = false; }
});
