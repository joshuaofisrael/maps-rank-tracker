// Stripe: customer portal sessions + webhook (plan sync). Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
const PLAN_BY_LINK = { plink_1UQrTUK3OWN3aipgLKJ6yx5D: "starter", plink_1UQrTXK3OWN3aipgJR9U2TnM: "growth", plink_1UQrTZK3OWN3aipgOxwsgM8J: "agency" };
const PLAN_BY_PRICE = { // live prices created 15 Oct 2026 on Joshua Israel Ventures LLC
  price_1UQrT3K3OWN3aipgrpocIH83: "starter", price_1UQrTMK3OWN3aipgg65juJCr: "growth", price_1UQrTOK3OWN3aipgSolgIKoF: "agency" };
async function stripe(env, path, params, method = "POST") {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { method,
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: method === "GET" ? undefined : new URLSearchParams(params) });
  return res.json();
}
export async function portalUrl(env, user) {
  if (!env.STRIPE_SECRET_KEY) return { error: "Billing not configured" };
  let customer = user.stripe_customer;
  if (!customer) {
    const found = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(user.email)}&limit=1`,
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }).then(r => r.json());
    customer = found.data?.[0]?.id;
  }
  if (!customer) return { error: "No subscription found for this email" };
  const s = await stripe(env, "billing_portal/sessions", { customer, return_url: "https://rankfootprint.com/account/" });
  return s.url ? { url: s.url } : { error: "Could not open billing portal" };
}
async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export async function verifyWebhook(env, payload, header) {
  if (!env.STRIPE_WEBHOOK_SECRET || !header) return false;
  const parts = Object.fromEntries(header.split(",").map(kv => kv.split("=")));
  const t = +parts.t; if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = await hmacHex(env.STRIPE_WEBHOOK_SECRET, `${t}.${payload}`);
  return header.split(",").some(kv => kv === `v1=${expected}`);
}
// Map subscription events to a plan on the user row (matched by customer email).
export async function applyEvent(env, evt) {
  const o = evt.data?.object || {};
  if (evt.type === "checkout.session.completed") {
    const email = o.customer_details?.email; if (!email) return;
    const plan = PLAN_BY_LINK[o.payment_link] || "starter";
    await env.DB.prepare(`INSERT INTO users (id,email,plan,stripe_customer,created_at) VALUES (?1,?2,?3,?4,?5)
      ON CONFLICT(email) DO UPDATE SET plan=?3, stripe_customer=?4`).bind(crypto.randomUUID(), email.toLowerCase(), plan, o.customer, new Date().toISOString()).run();
  }
  if (evt.type === "customer.subscription.updated" || evt.type === "customer.subscription.deleted") {
    const price = o.items?.data?.[0]?.price?.id;
    const plan = evt.type.endsWith("deleted") || o.status === "canceled" ? "free" : PLAN_BY_PRICE[price] || "starter";
    await env.DB.prepare("UPDATE users SET plan=?1 WHERE stripe_customer=?2").bind(plan, o.customer).run();
  }
}
