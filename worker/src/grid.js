// Build an n x n grid of lat/lng points spanning `radiusKm` around a centre.
export function buildGrid(lat, lng, n, radiusKm) {
  const pts = [], step = n > 1 ? (2 * radiusKm) / (n - 1) : 0;
  const dLat = km => km / 111.32, dLng = km => km / (111.32 * Math.cos(lat * Math.PI / 180));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const north = radiusKm - r * step, east = -radiusKm + c * step;
    pts.push({ row: r, col: c, lat: +(lat + dLat(north)).toFixed(6), lng: +(lng + dLng(east)).toFixed(6) });
  }
  return pts;
}
