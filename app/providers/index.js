import { mockAdapter } from "./mock.js";
import { workerAdapter } from "./worker.js";
// Returns an adapter with a uniform scan(points, query, target) method.
export function getAdapter(config) {
  if (config.provider === "worker" && config.workerUrl) return workerAdapter(config.workerUrl);
  return { ...mockAdapter, async scan(points, q, t) {
    return Promise.all(points.map(async p => ({ row: p.row, col: p.col, ...(await mockAdapter.rankAt(p, q, t)) })));
  } };
}
