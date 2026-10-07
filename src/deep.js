// deep scan: gpu tiles, pick minima, close them in workers, dedupe
import { findCandidates } from './scan.js';
import { KNOWN } from './known.js';
import { fingerprint } from './newton.js';

const knownFp = KNOWN.map((k) => ({ name: k.name, fp: fingerprint(k.v1, k.v2, k.T) }));
// butterfly I and II are different orbits with fp only 6e-5 apart, so keep this tight
const sameFp = (a, b) => Math.abs(a - b) < 1e-5 * Math.max(a, b);

function makePool(size, jobMs = 30000) {
  const mk = () => ({ w: new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }), busy: false });
  const workers = Array.from({ length: size }, mk);
  const queue = [];
  let id = 0;
  const pending = new Map();
  const attach = (slot) => {
    slot.w.onmessage = (ev) => {
      const p = pending.get(ev.data.id);
      if (!p) return; // answer for a job we already gave up on
      pending.delete(ev.data.id);
      clearTimeout(p.timer);
      slot.busy = false;
      p.resolve(ev.data);
      pump();
    };
  };
  const pump = () => {
    for (const slot of workers) {
      if (slot.busy || !queue.length) continue;
      const job = queue.shift();
      slot.busy = true;
      // a job that runs too long gets dropped and its worker replaced, otherwise one bad
      // candidate can block the whole tile
      const timer = setTimeout(() => {
        pending.delete(job.id);
        slot.w.terminate();
        slot.w = mk().w;
        attach(slot);
        slot.busy = false;
        job.resolve({ ok: false, res: Infinity, timeout: true });
        pump();
      }, jobMs);
      pending.set(job.id, { slot, resolve: job.resolve, timer });
      slot.w.postMessage(job.msg);
    }
  };
  workers.forEach(attach);
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

// Li and Liao's table (data/liliao.json), loaded once
let catalog = [];
export async function loadCatalog() {
  if (catalog.length) return;
  try {
    catalog = await (await fetch(new URL('../data/liliao.json', import.meta.url))).json();
  } catch (e) {
    catalog = [];
  }
}

// what is this orbit? returns a label if it's known / published / a figure-8 relative, else null
export function classify(fp) {
  const k = knownFp.find((x) => sameFp(x.fp, fp));
  if (k) return k.name;
  const c = catalog.find((x) => sameFp(x.fp, fp));
  if (c) return `Li-Liao ${c.name}`;
  for (let n = 2; n <= 12; n++) {
    const m = knownFp.find((x) => sameFp(x.fp * n, fp));
    if (m) return `${n}x ${m.name}`;
    const cm = catalog.find((x) => sameFp(x.fp * n, fp));
    if (cm) return `${n}x Li-Liao ${cm.name}`;
  }
  // figure-8 wound n times with a wobble has fp a bit off n * 9.2377
  const f8 = knownFp.find((x) => x.name === 'figure-8').fp;
  for (let n = 2; n <= 30; n++) {
    if (Math.abs(fp / (n * f8) - 1) < 5e-3) return `looks like ${n}x figure-8 (wobbly)`;
  }
  return null;
}

// splits region into tiles x tiles squares, each n x n cells
export async function deepScan({ screener, region, family = 'sd', ell = 0, tiles = 1, n = 512, tMax = 30, thr = 0.1, maxPerTile = 300, maxSteps = 15000, skip = 0, workers = 6, log = () => {}, onTile = () => {}, onUpdate = () => {}, state }) {
  await loadCatalog();
  const pool = makePool(workers);
  const st = state || { found: [], stats: { cells: 0, cands: 0, closed: 0, failed: 0, ms: 0 } };
  const t0 = performance.now();
  const dv1 = (region.v1Hi - region.v1Lo) / tiles;
  const dv2 = (region.v2Hi - region.v2Lo) / tiles;
  let tileNo = 0;
  for (let ty = 0; ty < tiles && !st.stop; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      if (st.stop) break;
      if (tileNo++ < skip) continue; // resuming an earlier run
      const reg = { v1Lo: region.v1Lo + tx * dv1, v1Hi: region.v1Lo + (tx + 1) * dv1, v2Lo: region.v2Lo + ty * dv2, v2Hi: region.v2Lo + (ty + 1) * dv2 };
      const perp = family === 'perp';
      const res = await screener.run({ n, ...reg, tMax, tMin: 1, maxSteps, ell, mode: perp ? 1 : 0 });
      st.stats.cells += n * n;
      onTile(res, reg, n);
      const cands = findCandidates({ ...res, n, region: reg, thr, max: maxPerTile });
      st.stats.cands += cands.length;
      const out = await Promise.all(
        cands.map((c) => pool.run(perp
          ? { kind: 'perp', v1: c.v1, v2: c.v2, T: c.T, ell }
          : { kind: 'close', v1: c.v1, v2: c.v2, T: c.T, perm: c.perm, ell }))
      );
      for (const r of out) {
        if (perp) {
          if (!r.ok) { st.stats.failed++; continue; }
          st.stats.closed++;
          const i = r.info;
          // mirror images have the opposite L, so compare |L|
          if (st.found.some((f) => Math.abs(f.fp - i.ts) < 1e-6 * i.ts && Math.abs(Math.abs(f.ls) - Math.abs(i.ls)) < 1e-6)) continue;
          st.found.push({ family: 'perp', v1: r.u1, v2: r.u2, ell: r.lam, t: r.t, period: i.T, E: i.E, L: i.L, ls: i.ls, theta: i.theta,
            repeatErr: i.repeatErr, fp: i.ts, minDist: i.minDist, res: r.res, known: null });
          continue;
        }
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

// take symmetric (perp family) orbits and slide lam until each one is truly periodic (rotation 0)
export async function huntAll({ rows, workers = 8, jobMs = 90000, target = 0, log = () => {}, state }) {
  const pool = makePool(workers, jobMs);
  const st = state || { found: [], tried: 0, ok: 0, why: {} };
  let done = 0;
  await Promise.all(rows.map(async (r) => {
    const out = await pool.run({ kind: 'perpHunt', v1: r.v1, v2: r.v2, ell: r.ell, T: r.t, tMax: target });
    done++;
    st.tried++;
    if (!out.ok) {
      const why = out.timeout ? 'timed out' : (out.why || 'failed').replace(/[0-9.\-]+/g, '#');
      st.why[why] = (st.why[why] || 0) + 1;
    } else {
      const i = out.info;
      st.ok++;
      // same orbit shows up from several starting points, and as its mirror image (L -> -L)
      const dup = st.found.some((f) => Math.abs(f.fp - i.ts) < 1e-7 * i.ts && Math.abs(Math.abs(f.ls) - Math.abs(i.ls)) < 1e-6);
      if (!dup) st.found.push({ family: 'perp', v1: out.u1, v2: out.u2, ell: out.lam, t: out.t, period: i.T, E: i.E, L: i.L, ls: i.ls,
        theta: i.theta, repeatErr: i.repeatErr, fp: i.ts, minDist: i.minDist, res: out.res, known: null });
    }
    log(`${done}/${rows.length} done, ${st.ok} reached rotation ${target}, ${st.found.length} distinct`);
  }));
  pool.close();
  return st;
}
