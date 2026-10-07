import { createScreener } from './gpu.js';
import { sdInitial, sampleOrbit } from './physics.js';

const $ = (id) => document.getElementById(id);
const mapCv = $('map');
const orbitCv = $('orbit');
const logEl = $('log');
const errEl = $('err');

let screener = null;
let region = { v1Lo: 0, v1Hi: 1, v2Lo: 0, v2Hi: 1 };
let lastClick = null;
let candidates = [];
let anim = null;
let paused = false;

const log = (s) => { logEl.textContent = s; };

function readRegion() {
  return {
    v1Lo: parseFloat($('v1lo').value), v1Hi: parseFloat($('v1hi').value),
    v2Lo: parseFloat($('v2lo').value), v2Hi: parseFloat($('v2hi').value),
  };
}

function writeRegion(r) {
  $('v1lo').value = +r.v1Lo.toPrecision(8);
  $('v1hi').value = +r.v1Hi.toPrecision(8);
  $('v2lo').value = +r.v2Lo.toPrecision(8);
  $('v2hi').value = +r.v2Hi.toPrecision(8);
}

// bright = comes back close, log scale
function colorFor(d) {
  const lo = Math.log10(1e-4), hi = Math.log10(3);
  const x = 1 - Math.min(1, Math.max(0, (Math.log10(Math.max(d, 1e-9)) - lo) / (hi - lo)));
  const r = Math.round(255 * Math.min(1, x * 1.6));
  const g = Math.round(255 * Math.min(1, Math.max(0, x * 1.6 - 0.35)));
  const b = Math.round(255 * Math.min(1, Math.max(0, x * 3 - 1.8)) + 40 * x);
  return [r, g, Math.min(255, b)];
}

function drawMap(d, n) {
  const off = document.createElement('canvas');
  off.width = off.height = n;
  const ctx = off.getContext('2d');
  const img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // v2 goes up
      const val = d[(n - 1 - y) * n + x];
      const [r, g, b] = colorFor(val);
      const o = (y * n + x) * 4;
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const c = mapCv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(off, 0, 0, mapCv.width, mapCv.height);
}

async function scan() {
  errEl.textContent = '';
  region = readRegion();
  if (![region.v1Lo, region.v1Hi, region.v2Lo, region.v2Hi].every(Number.isFinite)) {
    errEl.textContent = 'bad region values';
    return;
  }
  const n = parseInt($('n').value, 10);
  const tMax = parseFloat($('tmax').value) || 12;
  $('scan').disabled = true;
  log(`scanning ${n}x${n} = ${(n * n).toLocaleString()} orbits...`);
  const t0 = performance.now();
  try {
    const { d } = await screener.run({ n, ...region, tMax });
    drawMap(d, n);
    let best = Infinity;
    for (let i = 0; i < d.length; i++) if (d[i] < best) best = d[i];
    log(`done in ${((performance.now() - t0) / 1000).toFixed(2)}s, best float32 return distance ${best.toExponential(2)}\nclick a bright spot to refine it`);
  } catch (e) {
    errEl.textContent = String(e.message || e);
  } finally {
    $('scan').disabled = false;
  }
}

function pointFromEvent(ev) {
  const rect = mapCv.getBoundingClientRect();
  const fx = (ev.clientX - rect.left) / rect.width;
  const fy = 1 - (ev.clientY - rect.top) / rect.height;
  return {
    v1: region.v1Lo + fx * (region.v1Hi - region.v1Lo),
    v2: region.v2Lo + fy * (region.v2Hi - region.v2Lo),
  };
}

const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
let jobId = 0;

function refineAt(v1, v2) {
  const tMax = parseFloat($('tmax').value) || 12;
  log(`refining near v1=${v1.toFixed(5)} v2=${v2.toFixed(5)} (float64, in a worker)...`);
  worker.postMessage({ id: ++jobId, kind: 'refine', v1, v2, tMax });
}

worker.onmessage = (ev) => {
  const r = ev.data;
  if (r.id !== jobId) return; // old click
  const ok = r.ok;
  log(
    `v1 = ${r.v1.toFixed(12)}
v2 = ${r.v2.toFixed(12)}
` +
    `closing residual ${r.res.toExponential(2)}, T=${r.period.toFixed(8)}
` +
    (ok ? `periodic. scale-free fingerprint T|E|^1.5 = ${r.fp.toFixed(6)}` : 'did not converge to a closed orbit')
  );
  if (!ok) return;
  const c = { v1: r.v1, v2: r.v2, period: r.period, res: r.res, fp: r.fp, perm: r.perm };
  const dup = candidates.find((o) => Math.abs(o.fp - c.fp) < 1e-5);
  if (!dup) {
    candidates.push(c);
    renderCandidates();
  }
  showOrbit(c);
};

function renderCandidates() {
  const box = $('cands');
  box.innerHTML = '';
  candidates.forEach((c) => {
    const row = document.createElement('div');
    row.innerHTML = `<span>v=(${c.v1.toFixed(6)}, ${c.v2.toFixed(6)})</span><span>T=${c.period.toFixed(4)}</span>`;
    row.onclick = () => showOrbit(c);
    box.appendChild(row);
  });
}

function showOrbit(c) {
  const frames = 600;
  const path = sampleOrbit(sdInitial(c.v1, c.v2), c.period, frames);
  let ext = 0;
  for (let i = 0; i < path.length; i++) ext = Math.max(ext, Math.abs(path[i]));
  anim = { path, frames, ext: ext * 1.1 || 1, frame: 0, c };
  $('info').textContent = `v=(${c.v1.toFixed(6)}, ${c.v2.toFixed(6)})  T=${c.period.toFixed(5)}`;
}

const COLORS = ['#5eead4', '#fbbf24', '#f472b6'];

function tick() {
  const ctx = orbitCv.getContext('2d');
  const W = orbitCv.width;
  ctx.fillStyle = '#05070b';
  ctx.fillRect(0, 0, W, W);
  if (anim) {
    const { path, frames, ext } = anim;
    const s = (W / 2) / ext;
    const px = (x) => W / 2 + x * s;
    const py = (y) => W / 2 - y * s;
    for (let b = 0; b < 3; b++) {
      ctx.strokeStyle = COLORS[b] + '55';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let f = 0; f <= anim.frame; f++) {
        const x = px(path[f * 6 + b * 2]);
        const y = py(path[f * 6 + b * 2 + 1]);
        if (f === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = COLORS[b];
      ctx.beginPath();
      ctx.arc(px(path[anim.frame * 6 + b * 2]), py(path[anim.frame * 6 + b * 2 + 1]), 6, 0, 7);
      ctx.fill();
    }
    if (!paused) {
      anim.frame++;
      if (anim.frame >= frames) anim.frame = 0;
    }
  }
  requestAnimationFrame(tick);
}

mapCv.addEventListener('click', (ev) => {
  const p = pointFromEvent(ev);
  lastClick = p;
  refineAt(p.v1, p.v2);
});

$('scan').onclick = scan;
$('zoom').onclick = () => {
  if (!lastClick) { log('click a point on the map first, then zoom'); return; }
  const wx = (region.v1Hi - region.v1Lo) / 8;
  const wy = (region.v2Hi - region.v2Lo) / 8;
  writeRegion({
    v1Lo: lastClick.v1 - wx, v1Hi: lastClick.v1 + wx,
    v2Lo: lastClick.v2 - wy, v2Hi: lastClick.v2 + wy,
  });
  scan();
};
$('play').onclick = () => {
  paused = !paused;
  $('play').textContent = paused ? 'Play' : 'Pause';
};
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify(candidates, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'orbit-candidates.json';
  a.click();
};

(async () => {
  try {
    screener = await createScreener();
    log('gpu ready, hit Scan');
    scan();
  } catch (e) {
    errEl.textContent = String(e.message || e);
    log('no WebGPU here. the float64 refiner still works if you click the map, but there is nothing to click until a scan runs.');
  }
  tick();
})();

// for running scans from the console
import('./deep.js').then((m) => {
  window.hunter = {
    async run(opts) {
      const state = { found: [], stats: { cells: 0, cands: 0, closed: 0, failed: 0, ms: 0 } };
      window.hunter.state = state;
      await m.deepScan({ screener, state, log, ...opts });
      return state;
    },
  };
});
