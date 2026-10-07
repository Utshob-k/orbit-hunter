// local minima of the return distance in one tile
export function findCandidates({ d, t, p, n, region, thr = 0.1, max = 400 }) {
  const out = [];
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      const i = y * n + x;
      const v = d[i];
      if (!(v < thr) || t[i] === 0) continue;
      let isMin = true;
      for (let dy = -1; dy <= 1 && isMin; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx || dy) && d[i + dy * n + dx] < v) { isMin = false; break; }
        }
      if (!isMin) continue;
      out.push({
        d: v,
        T: t[i],
        perm: Math.round(p[i]),
        v1: region.v1Lo + ((x + 0.5) / n) * (region.v1Hi - region.v1Lo),
        v2: region.v2Lo + ((y + 0.5) / n) * (region.v2Hi - region.v2Lo),
      });
    }
  }
  out.sort((a, b) => a.d - b.d);
  return out.slice(0, max);
}
