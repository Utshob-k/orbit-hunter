// deep scan: gpu tiles, pick minima, close them in workers, dedupe
import { findCandidates } from './scan.js';
import { KNOWN } from './known.js';
import { fingerprint } from './newton.js';

const knownFp = KNOWN.map((k) => ({ name: k.name, fp: fingerprint(k.v1, k.v2, k.T) }));
// butterfly I and II are different orbits with fp only 6e-5 apart, so keep this tight
const sameFp = (a, b) => Math.abs(a - b) < 1e-5 * Math.max(a, b);

function makePool(size) {
  const workers = Array.from({ length: size }, () => ({
    w: new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }),
    busy: false,
  }));
  const queue = [];
  let id = 0;
  const pending = new Map();
  const pump = () => {
    for (const slot of workers) {
      if (slot.busy || !queue.length) continue;
      const job = queue.shift();
      slot.busy = true;
      pending.set(job.id, { slot, resolve: job.resolve });
      slot.w.postMessage(job.msg);
    }
  };
  workers.forEach((slot) => {
    slot.w.onmessage = (ev) => {
      const p = pending.get(ev.data.id);
      pending.delete(ev.data.id);
      p.slot.busy = false;
      p.resolve(ev.data);
      pump();
    };
  });
  return {
    run(msg) {
      return new Promise((resolve) => {
        const jid = ++id;
        queue.push({ id: jid, msg: { ...msg, id: jid }, resolve });
        pump();
      });
    },
    close() { workers.forEach((s) => s.w.terminate()); },
  };
}

// name of the known orbit this is, or 'Nx name' if it's just a known one run N times
export function classify(fp) {
  const k = knownFp.find((x) => sameFp(x.fp, fp));
  if (k) return k.name;
  for (let n = 2; n <= 12; n++) {
    const m = knownFp.find((x) => sameFp(x.fp * n, fp));
    if (m) return `${n}x ${m.name}`;
  }
  return null;
}

// splits region into tiles x tiles squares, each n x n cells
export async function deepScan({ screener, region, ell = 0, tiles = 1, n = 512, tMax = 30, thr = 0.1, maxPerTile = 300, workers = 6, log = () => {}, onTile = () => {}, onUpdate = () => {}, state }) {
  const pool = makePool(workers);
  const st = state || { found: [], stats: { cells: 0, cands: 0, closed: 0, failed: 0, ms: 0 } };
  const t0 = performance.now();
  const dv1 = (region.v1Hi - region.v1Lo) / tiles;
  const dv2 = (region.v2Hi - region.v2Lo) / tiles;
  for (let ty = 0; ty < tiles && !st.stop; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      if (st.stop) break;
      const reg = { v1Lo: region.v1Lo + tx * dv1, v1Hi: region.v1Lo + (tx + 1) * dv1, v2Lo: region.v2Lo + ty * dv2, v2Hi: region.v2Lo + (ty + 1) * dv2 };
      const res = await screener.run({ n, ...reg, tMax, tMin: 1, maxSteps: 250000, ell });
      st.stats.cells += n * n;
      onTile(res, reg, n);
      const cands = findCandidates({ ...res, n, region: reg, thr, max: maxPerTile });
      st.stats.cands += cands.length;
      const out = await Promise.all(
        cands.map((c) => pool.run({ kind: 'close', v1: c.v1, v2: c.v2, T: c.T, perm: c.perm, ell }))
      );
      for (const r of out) {
        if (!r.ok) { st.stats.failed++; continue; }
        st.stats.closed++;
        if (st.found.some((f) => sameFp(f.fp, r.fp))) continue;
        // the known list only covers ell = 0
        const known = ell === 0 ? classify(r.fp) : null;
        st.found.push({ v1: r.v1, v2: r.v2, ell, period: r.period, fp: r.fp, E: r.E, res: r.res, minDist: r.minDist, extent: r.extent, perm: r.perm, known });
      }
      st.stats.ms = performance.now() - t0;
      onUpdate();
      log(`tile ${tx},${ty}: ${cands.length} candidates, ${st.found.length} distinct orbits so far (${st.found.filter((f) => !f.known).length} not in the known list)`);
    }
  }
  pool.close();
  return st;
}
