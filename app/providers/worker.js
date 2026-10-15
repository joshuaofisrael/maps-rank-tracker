// Calls the TileRank Cloudflare Worker, which holds the provider key as a secret.
export function workerAdapter(baseUrl) {
  return {
    id: "worker", label: "Live data via TileRank Worker", isDemo: false,
    async scan(points, query, target) {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/scan`, { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points, query, target }) });
      if (!res.ok) throw new Error(`Worker error ${res.status}`);
      return (await res.json()).results; // [{row,col,rank,demo}]
    }
  };
}
