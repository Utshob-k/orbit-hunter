import { createScreener } from './gpu.js';
import { sdInitial, sampleOrbit } from './physics.js';

const $ = (id) => document.getElementById(id);
const mapCv = $('map');
const orbitCv = $('orbit');

let screener = null;
let view = { v1Lo: 0, v1Hi: 1, v2Lo: 0, v2Hi: 1 };
let ell = 0;
let rows = []; // orbits found this session
let anim = null;
let paused = false;
let running = false;
let deepState = null;

const log = (s) => { $('log').textContent = s; };
const num = (id) => parseFloat($(id).value);

// plot area inside the map canvas (leaves room for axis numbers)
const PM = { l: 58, t: 10, r: 14, b: 46 };
const plotW = () => mapCv.width - PM.l - PM.r;
const plotH = () => mapCv.height - PM.t - PM.b;

function readView() {
  return { v1Lo: num('v1lo'), v1Hi: num('v1hi'), v2Lo: num('v2lo'), v2Hi: num('v2hi') };
}

// light = comes back close, dark = doesnt. roughly viridis, flipped
const STOPS = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
function color(d) {
  const lo = -4, hi = Math.log10(3);
  let x = 1 - (Math.log10(Math.max(d, 1e-9)) - lo) / (hi - lo);
  x = Math.min(1, Math.max(0, x));
  const f = x * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(f));
  const k = f - i;
  return STOPS[i].map((c, j) => Math.round(c + (STOPS[i + 1][j] - c) * k));
}

function drawAxes() {
  const c = mapCv.getContext('2d');
  c.fillStyle = '#fff';
  c.fillRect(0, 0, mapCv.width, mapCv.height);
  c.fillStyle = '#e6e6e6';
  c.fillRect(PM.l, PM.t, plotW(), plotH());
  c.strokeStyle = '#000';
  c.fillStyle = '#000';
  c.lineWidth = 1;
  c.strokeRect(PM.l + 0.5, PM.t + 0.5, plotW(), plotH());
  c.font = '12px Georgia, serif';
  c.textAlign = 'center';
  for (let i = 0; i <= 5; i++) {
    const x = PM.l + (plotW() * i) / 5;
    const v = view.v1Lo + ((view.v1Hi - view.v1Lo) * i) / 5;
    c.beginPath(); c.moveTo(x + 0.5, PM.t + plotH()); c.lineTo(x + 0.5, PM.t + plotH() + 5); c.stroke();
    c.fillText(+v.toPrecision(5), x, PM.t + plotH() + 18);
  }
  c.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const y = PM.t + plotH() - (plotH() * i) / 5;
    const v = view.v2Lo + ((view.v2Hi - view.v2Lo) * i) / 5;
    c.beginPath(); c.moveTo(PM.l, y + 0.5); c.lineTo(PM.l - 5, y + 0.5); c.stroke();
    c.fillText(+v.toPrecision(5), PM.l - 8, y + 4);
  }
  c.textAlign = 'center';
  c.font = '14px Georgia, serif';
  c.fillText('v1', PM.l + plotW() / 2, mapCv.height - 8);
  c.save();
  c.translate(14, PM.t + plotH() / 2);
  c.rotate(-Math.PI / 2);
  c.fillText('v2', 0, 0);
  c.restore();
}

// draw one tile of results into the right spot of the map
function drawTile(d, n, reg) {
  const off = document.createElement('canvas');
  off.width = off.height = n;
  const octx = off.getContext('2d');
  const img = octx.createImageData(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const [r, g, b] = color(d[(n - 1 - y) * n + x]); // flip, v2 goes up
      const o = (y * n + x) * 4;
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  const sx = (v) => PM.l + ((v - view.v1Lo) / (view.v1Hi - view.v1Lo)) * plotW();
  const sy = (v) => PM.t + plotH() - ((v - view.v2Lo) / (view.v2Hi - view.v2Lo)) * plotH();
  const c = mapCv.getContext('2d');
  c.imageSmoothingEnabled = false;
  const x0 = sx(reg.v1Lo), x1 = sx(reg.v1Hi), y0 = sy(reg.v2Hi), y1 = sy(reg.v2Lo);
  c.drawImage(off, x0, y0, x1 - x0, y1 - y0);
}

function readOpts() {
  view = readView();
  ell = num('ell') || 0;
  return {
    region: view,
    ell,
    n: parseInt($('n').value, 10),
    tiles: Math.max(1, parseInt($('tiles').value, 10) || 1),
    tMax: num('tmax') || 15,
    thr: num('thr') || 0.03,
    maxPerTile: parseInt($('maxc').value, 10) || 120,
    workers: Math.min(16, Math.max(1, parseInt($('workers').value, 10) || 4)),
  };
}

function setBusy(b) {
  running = b;
  $('scan').disabled = b;
  $('deep').disabled = b;
}

async function scanOnce() {
  $('err').textContent = '';
  const o = readOpts();
  if (![view.v1Lo, view.v1Hi, view.v2Lo, view.v2Hi].every(Number.isFinite)) {
    $('err').textContent = 'region values are not numbers';
    return;
  }
  setBusy(true);
  drawAxes();
  log(`scanning ${o.n}x${o.n} cells...`);
  const t0 = performance.now();
  try {
    const res = await screener.run({ n: o.n, ...view, tMax: o.tMax, ell: o.ell, maxSteps: 250000 });
    drawTile(res.d, o.n, view);
    let best = Infinity;
    for (const v of res.d) if (v < best) best = v;
    log(`${(o.n * o.n).toLocaleString()} orbits in ${((performance.now() - t0) / 1000).toFixed(2)} s, smallest float32 return distance ${best.toExponential(2)}`);
  } catch (e) {
    $('err').textContent = String(e.message || e);
  }
  setBusy(false);
}

async function deepRun() {
  $('err').textContent = '';
  const o = readOpts();
  setBusy(true);
  drawAxes();
  rows = [];
  renderRows();
  deepState = { found: [], stats: { cells: 0, cands: 0, closed: 0, failed: 0, ms: 0 }, stop: false };
  const { deepScan } = await import('./deep.js');
  try {
    await deepScan({
      screener, state: deepState, ...o,
      log,
      onTile: (res, reg, n) => drawTile(res.d, n, reg),
      onUpdate: () => { rows = deepState.found; renderRows(); },
    });
    rows = deepState.found;
    renderRows();
    const s = deepState.stats;
    log(`${deepState.stop ? 'stopped' : 'done'}: ${s.cells.toLocaleString()} orbits screened, ${s.cands} candidates, ${s.closed} closed, ${s.failed} did not close, ${(s.ms / 1000).toFixed(0)} s`);
  } catch (e) {
    $('err').textContent = String(e.message || e);
  }
  setBusy(false);
}

function statusOf(r) {
  if (r.ell !== 0) return 'L not 0, nothing to compare with';
  return r.known ? `known: ${r.known}` : 'not in my list';
}

function renderRows() {
  const tb = $('results').querySelector('tbody');
  tb.innerHTML = '';
  const sorted = [...rows].sort((a, b) => (!!a.known - !!b.known) || a.period - b.period);
  sorted.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.className = 'click';
    const cells = [i + 1, r.v1.toFixed(9), r.v2.toFixed(9), +r.ell.toFixed(6), r.period.toFixed(6), r.E.toFixed(6), r.fp.toFixed(5),
      Number.isFinite(r.minDist) ? r.minDist.toFixed(4) : '?'];
    cells.forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    const st = document.createElement('td');
    st.className = 'l';
    st.textContent = statusOf(r);
    tr.appendChild(st);
    tr.onclick = () => showOrbit(r);
    tb.appendChild(tr);
  });
  const fresh = rows.filter((r) => !r.known).length;
  $('summary').textContent = rows.length
    ? `${rows.length} distinct orbits, ${fresh} not in the built-in list.`
    : 'No orbits yet.';
}

// click on the map: refine that spot in a worker
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
let jobId = 0;

mapCv.addEventListener('click', (ev) => {
  if (running) return;
  const rect = mapCv.getBoundingClientRect();
  const px = ((ev.clientX - rect.left) / rect.width) * mapCv.width;
  const py = ((ev.clientY - rect.top) / rect.height) * mapCv.height;
  const fx = (px - PM.l) / plotW();
  const fy = 1 - (py - PM.t) / plotH();
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
  const v1 = view.v1Lo + fx * (view.v1Hi - view.v1Lo);
  const v2 = view.v2Lo + fy * (view.v2Hi - view.v2Lo);
  log(`refining near v1 = ${v1.toFixed(5)}, v2 = ${v2.toFixed(5)} ...`);
  worker.postMessage({ id: ++jobId, kind: 'refine', v1, v2, tMax: num('tmax') || 15, ell });
});

worker.onmessage = (ev) => {
  const r = ev.data;
  if (r.id !== jobId) return;
  if (!r.ok) {
    log(`no closed orbit found there (residual ${r.res.toExponential(2)})`);
    return;
  }
  log(`v1 = ${r.v1.toFixed(12)}\nv2 = ${r.v2.toFixed(12)}\nT = ${r.period.toFixed(8)}, residual ${r.res.toExponential(2)}, T|E|^1.5 = ${r.fp.toFixed(6)}`);
  const same = rows.find((o) => o.ell === r.ell && Math.abs(o.fp - r.fp) < 1e-5 * r.fp);
  if (!same) {
    import('./deep.js').then((m) => {
      rows.push({ ...r, known: r.ell === 0 ? m.classify(r.fp) : null });
      renderRows();
    });
  }
  showOrbit(r);
};

// orbit plot
const COLS = ['#000000', '#1f4e9c', '#b22222'];

function showOrbit(r) {
  const frames = 600;
  const path = sampleOrbit(sdInitial(r.v1, r.v2, r.ell || 0), r.period, frames);
  let ext = 0;
  for (let i = 0; i < path.length; i++) ext = Math.max(ext, Math.abs(path[i]));
  anim = { path, frames, ext: ext * 1.1 || 1, frame: 0 };
  $('info').textContent = `v1 = ${r.v1.toFixed(6)}, v2 = ${r.v2.toFixed(6)}, L = ${(r.ell || 0).toFixed(4)}, T = ${r.period.toFixed(5)}`;
}

function drawOrbit() {
  const c = orbitCv.getContext('2d');
  const W = orbitCv.width;
  c.fillStyle = '#fff';
  c.fillRect(0, 0, W, W);
  c.strokeStyle = '#000';
  c.lineWidth = 1;
  c.strokeRect(0.5, 0.5, W - 1, W - 1);
  if (!anim) {
    c.fillStyle = '#666';
    c.font = '14px Georgia, serif';
    c.textAlign = 'center';
    c.fillText('nothing selected yet', W / 2, W / 2);
    return;
  }
  const { path, frames, ext } = anim;
  const s = (W / 2) / ext;
  const px = (x) => W / 2 + x * s;
  const py = (y) => W / 2 - y * s;
  // faint axes through the origin
  c.strokeStyle = '#ddd';
  c.beginPath(); c.moveTo(0, W / 2); c.lineTo(W, W / 2); c.moveTo(W / 2, 0); c.lineTo(W / 2, W); c.stroke();
  for (let b = 0; b < 3; b++) {
    c.strokeStyle = COLS[b];
    c.lineWidth = 1;
    c.beginPath();
    for (let f = 0; f <= anim.frame; f++) {
      const x = px(path[f * 6 + b * 2]), y = py(path[f * 6 + b * 2 + 1]);
      if (f === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    // start position, open circle
    c.beginPath(); c.arc(px(path[b * 2]), py(path[b * 2 + 1]), 4, 0, 7); c.stroke();
    // where it is now
    c.fillStyle = COLS[b];
    c.beginPath(); c.arc(px(path[anim.frame * 6 + b * 2]), py(path[anim.frame * 6 + b * 2 + 1]), 4, 0, 7); c.fill();
  }
  if (!paused) anim.frame = (anim.frame + 1) % frames;
}

function loop() {
  drawOrbit();
  requestAnimationFrame(loop);
}

$('scan').onclick = scanOnce;
$('deep').onclick = deepRun;
$('stop').onclick = () => { if (deepState) deepState.stop = true; };
$('play').onclick = () => {
  paused = !paused;
  $('play').textContent = paused ? 'Play' : 'Pause';
};
$('csv').onclick = () => {
  const head = 'v1,v2,ell,period,E,fp,min_sep,status';
  const lines = rows.map((r) => [r.v1, r.v2, r.ell, r.period, r.E, r.fp, r.minDist, JSON.stringify(statusOf(r))].join(','));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([[head, ...lines].join('\n')], { type: 'text/csv' }));
  a.download = 'orbits.csv';
  a.click();
};

// so scans can also be run from the console
window.hunter = { rows: () => rows, state: () => deepState };

drawAxes();
loop();
(async () => {
  try {
    screener = await createScreener();
    log('gpu is ready');
    scanOnce();
  } catch (e) {
    $('err').textContent = String(e.message || e);
    log('no WebGPU in this browser');
  }
})();
