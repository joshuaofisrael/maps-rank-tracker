// DEMO ONLY: fabricated, deterministic ranks so the UI can be shown without a paid data provider.
// Never present these numbers as real rankings.
function hash(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
export const mockAdapter = {
  id: "mock", label: "Demo data (not real rankings)", isDemo: true,
  async rankAt(point, query, target) {
    const h = hash(`${point.lat},${point.lng}|${query}|${target}`) % 100;
    const rank = h < 12 ? null : 1 + (h % 20); // ~12% "not found"
    return { rank, demo: true };
  }
};
