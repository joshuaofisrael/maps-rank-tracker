// Front-end config. No secrets ever live here: real provider keys are Cloudflare Worker secrets (see /worker).
// provider: "mock" (demo data, default) | "worker" (calls the deployed RankFootprint Worker /api/scan).
export const config = { provider: "mock", workerUrl: "" };
