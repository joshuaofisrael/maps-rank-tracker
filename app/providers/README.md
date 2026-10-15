# Rank-data adapters
Every adapter exports `{ id, label, isDemo, rankAt(point, query, target) }`.
`rankAt` resolves to `{ rank: number|null, demo: boolean }` (null = not found in results).
- `mock.js`: deterministic fake ranks for the UI. Output is always flagged `demo: true` and labelled DEMO DATA.
- `worker.js`: browser-side adapter that calls the RankFootprint Worker (`/api/scan`). The Worker holds the key.
Server-side adapters (DataForSEO, SerpApi, Google Places) live in `/worker/src/providers.js`.
