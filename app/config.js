// Front-end config. No secrets here: provider keys are Cloudflare Worker secrets (see /worker).
// apiBase: deployed Worker URL. Empty = scans not live yet (forms show a clear "not live" message, app uses labelled demo data).
// paidOpen: show Stripe checkout buttons on /pricing.html. Keep false until live data capacity can serve paid plans.
export const config = {
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
