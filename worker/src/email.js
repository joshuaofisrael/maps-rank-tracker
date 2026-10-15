// Transactional email via Resend (free tier: 3,000/month, 100/day). Disabled unless EMAIL_ENABLED === "true"
// AND RESEND_API_KEY is set AND the sending domain is verified in Resend. Until then, sends are skipped and logged.
import { clean } from "./util.js";
const FOOTER = "\n\n--\nRankFootprint, operated by Joshua Israel Ventures LLC.\nYou received this because you requested it at rankfootprint.com.";
export async function sendEmail(env, { to, subject, text }) {
  if (env.EMAIL_ENABLED !== "true" || !env.RESEND_API_KEY) {
    console.log(`[email disabled] to=${to} subject=${subject}`);
    return { sent: false, reason: "email disabled" };
  }
  const res = await fetch("https://api.resend.com/emails", { method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM || "RankFootprint <scans@rankfootprint.com>", to: [to], subject, text: text + FOOTER }) });
  return { sent: res.ok, status: res.status };
}
export const scanResultEmail = (scan, url) => ({
  subject: `Your RankFootprint 3×3 scan: ${clean(scan.business, 60)}`,
  text: `Here is your free 3×3 Google Maps grid scan for "${scan.keyword}" (${scan.business}).\n\n` +
    `Found in ${scan.summary.found} of ${scan.summary.total} points · top-3 in ${scan.summary.top3} · average rank ${scan.summary.avg ?? "n/a"}.\n\n` +
    `View and share the full grid: ${url}\n\nHow to read it: https://rankfootprint.com/help/how-to-read-a-maps-rank-grid.html`
});
export const magicLinkEmail = url => ({
  subject: "Your RankFootprint sign-in link",
  text: `Click to sign in (valid for 15 minutes, single use):\n${url}\n\nIf you didn't request this, ignore this email.`
});
