// Front-end config. No secrets here: provider keys are Cloudflare Worker secrets (see /worker).
// scanApi: deployed Worker URL used by the free scan form and shared results pages. Empty = free scan form posts to FormSubmit only.
//   If the Worker errors (e.g. 503 "warming_up" until SERPAPI_KEY is set, or the free budget is used), the form falls back to FormSubmit.
// apiBase: Worker URL for accounts (magic-link sign-in). Keep empty until Worker email (Resend) is enabled, or sign-in links never arrive.
// paidOpen: show Stripe checkout buttons on /pricing.html. Keep false until live data capacity can serve paid plans.
export const config = {
  scanApi: "https://rankfootprint-api.joshofisrael.workers.dev",
  apiBase: "",
  provider: "mock",
  paidOpen: true,
  paymentLinks: {
    starter: "https://buy.stripe.com/aFa8wQ0jS5858NN2rSb3r16",
    growth: "https://buy.stripe.com/cNi8wQ5Ecbwte878Qgb3r17",
    agency: "https://buy.stripe.com/9B63cw3w4aspggf4A0b3r18"
  },
  portalLogin: "https://billing.stripe.com/p/login/bJeaEY2s0585fcbeaAb3q00"
};
