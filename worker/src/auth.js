// Passwordless magic-link auth on D1. Tokens and session ids are stored only as SHA-256 hashes.
import { randomId, sha256, emailOk, now } from "./util.js";
import { sendEmail, magicLinkEmail } from "./email.js";
const SESSION_DAYS = 30;
export async function requestLink(env, email) {
  email = String(email || "").toLowerCase().trim();
  if (!emailOk(email)) return { status: 400, body: { error: "Valid email required" } };
  const token = randomId(24);
  await env.DB.prepare("INSERT INTO magic_tokens (token_hash,email,expires_at) VALUES (?1,?2,?3)")
    .bind(await sha256(token), email, Date.now() + 15 * 60 * 1000).run();
  const url = `${env.API_BASE || "https://api.rankfootprint.com"}/api/auth/verify?token=${token}`;
  const r = await sendEmail(env, { to: email, ...magicLinkEmail(url) });
  // Same response whether or not the email exists (no account enumeration).
  return { status: 200, body: { ok: true, emailed: r.sent } };
}
export async function verify(env, token) {
  const h = await sha256(token || "");
  const row = await env.DB.prepare("SELECT email,expires_at,used FROM magic_tokens WHERE token_hash=?1").bind(h).first();
  if (!row || row.used || row.expires_at < Date.now()) return null;
  await env.DB.prepare("UPDATE magic_tokens SET used=1 WHERE token_hash=?1").bind(h).run();
  let user = await env.DB.prepare("SELECT * FROM users WHERE email=?1").bind(row.email).first();
  if (!user) {
    user = { id: crypto.randomUUID(), email: row.email };
    await env.DB.prepare("INSERT INTO users (id,email,created_at) VALUES (?1,?2,?3)").bind(user.id, user.email, now()).run();
  }
  const sid = randomId(32);
  await env.DB.prepare("INSERT INTO sessions (id_hash,user_id,expires_at) VALUES (?1,?2,?3)")
    .bind(await sha256(sid), user.id, Date.now() + SESSION_DAYS * 864e5).run();
  return `rf_session=${sid}; Domain=rankfootprint.com; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}
export async function currentUser(env, req) {
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)rf_session=([a-f0-9]+)/);
  if (!m || !env.DB) return null;
  const s = await env.DB.prepare("SELECT user_id,expires_at FROM sessions WHERE id_hash=?1").bind(await sha256(m[1])).first();
  if (!s || s.expires_at < Date.now()) return null;
  return env.DB.prepare("SELECT id,email,plan,stripe_customer FROM users WHERE id=?1").bind(s.user_id).first();
}
export async function logout(env, req) {
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)rf_session=([a-f0-9]+)/);
  if (m) await env.DB.prepare("DELETE FROM sessions WHERE id_hash=?1").bind(await sha256(m[1])).run();
  return "rf_session=; Domain=rankfootprint.com; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
