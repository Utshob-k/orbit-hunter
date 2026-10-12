// the slope at the branch point: the slope dT*/d(turns) of the satellite curve at the branch point against the slope of the repeat curve read from the family R alone
// (both are pi L*_member in absolute value if Henon's relation holds). reads data/r-family-trace.json and data/branch-points/<n>-upper.json. node tools/henon-slope-check.mjs
import fs from 'fs';
import { fileURLToPath } from 'url';
const D = fileURLToPath(new URL('../data/', import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const trace = read('r-family-trace.json').curve;
const stable = (p) => p.nus && p.nus.length === 2 && p.nus.every((x) => Math.abs(x[1] - 1) < 1e-6);
const nuOf = (p, which) => { const v = p.nus.map((x) => x[0]).sort((a, b) => a - b); return which === 'upper' ? v[1] : v[0]; };

// bracket of the crossing nu = 1/n on the stable steps of the trace
function bracket(n, which) {
  for (let i = 0; i < trace.length - 1; i++) {
    const a = trace[i], b = trace[i + 1];
    if (!stable(a) || !stable(b)) continue;
    const da = nuOf(a, which) - 1 / n, db = nuOf(b, which) - 1 / n;
    if (da * db < 0) return { i, f: da / (da - db) };
  }
  return null;
}
// derivative of y against x at parameter f in [i, i+1] from the three points p0, p1, p2 (parabola through them, x = their own x values)
function deriv3(p0, p1, p2, x, y, xc) {
  const x0 = x(p0), x1 = x(p1), x2 = x(p2), y0 = y(p0), y1 = y(p1), y2 = y(p2);
  return y0 * (2 * xc - x1 - x2) / ((x0 - x1) * (x0 - x2)) + y1 * (2 * xc - x0 - x2) / ((x1 - x0) * (x1 - x2)) + y2 * (2 * xc - x0 - x1) / ((x2 - x0) * (x2 - x1));
}
const T = (p) => p.Tstar, TU = (p) => -p.turns; // the trace has the opposite sign of the branch-point files

function repeatSlope(n, which) {
  const br = bracket(n, which);
  if (!br) return null;
  const { i, f } = br, a = trace[i], b = trace[i + 1];
  const sec = (b.Tstar - a.Tstar) / (TU(b) - TU(a));
  const xc = TU(a) + f * (TU(b) - TU(a));
  const Tc = a.Tstar + f * (b.Tstar - a.Tstar), Lc = a.Lstar + f * (b.Lstar - a.Lstar), lc = a.lam + f * (b.lam - a.lam);
  const d1 = i > 0 ? deriv3(trace[i - 1], a, b, TU, T, xc) : NaN;
  const d2 = i + 2 < trace.length ? deriv3(a, b, trace[i + 2], TU, T, xc) : NaN;
  const dd = [d1, d2].filter(Number.isFinite);
  const m3 = dd.reduce((s, v) => s + v, 0) / dd.length;
  const dlam = (b.lam - a.lam) / (b.Lstar - a.Lstar);
  return { sec, m3, uR: Math.abs(Math.abs(sec) - Math.abs(m3)), xc, Tc, Lc, lc, dlam, i, f, inside: true };
}

function satSlope(file, memberTurns, rep) {
  const d = read('branch-points/' + file);
  const sat = d.satellite.find((s) => s.zero) || d.satellite.find((s) => s.sense === 1);
  const c = sat.curve, p0 = c[0];
  const out = { sense: sat.sense, zero: sat.zero ? sat.zero.Tstar : null, zeroTurnsS: sat.zero ? sat.zero : null, d, p0, C: {}, curve: c };
  const last = 10 ** (Math.floor(Math.log10(p0.Tstar)) - 9);
  for (const delta of [1e-7, 1e-6, 1e-5]) {
    const j = c.findIndex((p, k) => k > 0 && Math.abs(p.turns - p0.turns) > delta);
    if (j < 0) { out.C[delta] = null; continue; }
    const p = c[j], dt = p.turns - p0.turns;
    const Dj = Math.abs(p.lam - (p0.lam + rep.dlam * (p.Lstar - p0.Lstar)));
    out.C[delta] = { C: (p.Tstar - p0.Tstar) / dt, j, s: p.s, dt, res: last / Math.abs(dt), D: Dj, confirmed: Dj >= 1e-4 };
  }
  return out;
}

const f2 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '   -  ' : v.toFixed(3).padStart(7));
const g = (v) => (v === null || !Number.isFinite(v) ? '-' : v.toExponential(2));

function run(which, ns) {
  const rows = [];
  console.log(`\n=== ${which} nu = 1/n`);
  console.log('n | S_sat(1e-7) | S_sat(1e-6) | S_sat(1e-5) | u_sat | S_R secant | S_R 3pt | u_R | ratio S_R/S_sat | |dS|/S_sat | D (lam) | confirmed | sign ok | agree | |cross-member| turns, T*');
  for (const n of ns) {
    const file = `${n}-${which}.json`;
    if (!fs.existsSync(D + 'branch-points/' + file)) continue;
    const rep = repeatSlope(n, which);
    if (!rep) { console.log(`${n} | no stable trace crossing`); rows.push({ n, status: 'no crossing' }); continue; }
    const s = satSlope(file, null, rep);
    const c1 = s.C[1e-7];
    if (!c1) { console.log(`${n} | no point beyond 1e-7 turns`); rows.push({ n, status: 'no point' }); continue; }
    const Cs = Object.values(s.C).filter((x) => x && x.confirmed).map((x) => Math.abs(x.C));
    const usatDelta = Math.max(...Object.values(s.C).filter((x) => x && x.confirmed).map((x) => Math.abs(Math.abs(x.C) - Math.abs(c1.C))));
    const usat = Math.max(usatDelta, c1.res);
    const Ssat = Math.abs(c1.C), SR = Math.abs(rep.sec);
    const tol = Math.max(0.03 * Ssat, usat, rep.uR);
    const sign = Math.sign(c1.C) === Math.sign(rep.sec);
    const row = { n, Ssat, SR, ratio: SR / Ssat, usat, uR: rep.uR, conf: c1.confirmed, agree: c1.confirmed && Math.abs(SR - Ssat) <= tol, sign, resolved: usat <= 0.1 * Ssat, member: s.d.member, p0: s.p0, zero: s.zero, status: 'ok', S6: s.C[1e-6] && s.C[1e-6].confirmed ? Math.abs(s.C[1e-6].C) : null, Lm: s.d.member.Lstar, curve: s.curve, zeroPt: s.zeroTurnsS };
    rows.push(row);
    const dm = `${g(Math.abs(rep.xc - s.d.member.turns))}, ${g(Math.abs(rep.Tc - s.d.member.Tstar))}`;
    console.log([n, f2(Ssat), f2(s.C[1e-6] ? Math.abs(s.C[1e-6].C) : null), f2(s.C[1e-5] ? Math.abs(s.C[1e-5].C) : null), f2(usat), f2(SR), f2(Math.abs(rep.m3)), f2(rep.uR), (SR / Ssat).toFixed(4), (Math.abs(SR - Ssat) / Ssat).toFixed(4), g(c1.D), c1.confirmed ? 'yes' : 'NO', sign ? 'yes' : 'NO', row.agree ? 'AGREE' : (c1.confirmed ? 'differ' : 'n/c'), dm].join(' | ') + (row.resolved ? '' : ' | unresolved (u_sat > 10 %)'));
  }
  return rows;
}

const upper = run('upper', Array.from({ length: 52 }, (_, k) => k + 5));
const ok = upper.filter((r) => r.status === 'ok' && r.conf && r.resolved);
const ag = ok.filter((r) => r.agree);
console.log(`\nVERDICT (upper, n = 5 to 56): ${upper.filter((r) => r.status === 'ok').length} n with data, ${ok.length} confirmed and resolved, ${ag.length} agree (${(100 * ag.length / ok.length).toFixed(1)} %) -> ${ag.length / ok.length >= 0.9 ? 'HOLDS' : ag.length / ok.length >= 0.5 ? 'PARTLY' : 'FAILS'}`);
const rat = ok.map((r) => r.ratio);
console.log(`ratio S_R / S_sat over the confirmed and resolved n: min ${Math.min(...rat).toFixed(4)}, max ${Math.max(...rat).toFixed(4)}, spread ${(Math.max(...rat) - Math.min(...rat)).toFixed(4)} (drift reported if above 0.05); at n = 5, 20, 36, 56: ${[5, 20, 36, 56].map((n) => { const r = upper.find((q) => q.n === n && q.status === 'ok'); return r ? r.ratio.toFixed(4) : '-'; }).join(', ')}`);
console.log('n not confirmed: ' + upper.filter((r) => r.status === 'ok' && !r.conf).map((r) => r.n).join(', ') + '; unresolved: ' + upper.filter((r) => r.status === 'ok' && r.conf && !r.resolved).map((r) => r.n).join(', ') + '; sign differs: ' + upper.filter((r) => r.status === 'ok' && !r.sign).map((r) => r.n).join(', ') + '; no data: ' + upper.filter((r) => r.status !== 'ok').map((r) => r.n).join(', '));
console.log('largest u_R / S_R: ' + Math.max(...ok.map((r) => r.uR / r.SR)).toExponential(2) + '; the doc values of C_loc to reproduce: n = 5 8.2, 20 10.1, 36 11.45: ' + [5, 20, 36].map((n) => upper.find((q) => q.n === n).Ssat.toFixed(3)).join(', '));

// P2: slope-only prediction of delta_n
console.log('\n=== P2: delta_hat = S_R x eps_n against delta_n = T*(first point) - T*(zero), upper, zeros from the stored files');
console.log('n | eps_n | delta_n | delta_hat | delta_hat/delta | mean slope delta/eps | S_sat');
let within = [], beyond = [];
for (const r of upper) {
  if (r.status !== 'ok' || r.zero === null) continue;
  const eps = r.n * Math.abs(r.member.turns) - 1, delta = r.p0.Tstar - r.zero, dh = r.SR * eps, q = dh / delta;
  (Math.abs(q - 1) <= 0.12 ? within : beyond).push(r.n);
  console.log([r.n, eps.toExponential(3), delta.toFixed(4), dh.toFixed(4), q.toFixed(3), (delta / eps).toFixed(2), r.Ssat.toFixed(2)].join(' | '));
}
console.log('within 12 % of delta_n: n = ' + within.join(' ') + '\noutside 12 %: n = ' + beyond.join(' '));

// secondary: lower nu
const lower = run('lower', Array.from({ length: 18 }, (_, k) => k + 3));
const lok = lower.filter((r) => r.status === 'ok' && r.conf && r.resolved);
console.log(`\nSECONDARY (lower nu, exploratory): ${lok.length} confirmed and resolved, ${lok.filter((r) => r.agree).length} agree; n with data without trace crossing or point: ${lower.filter((r) => r.status !== 'ok').map((r) => r.n).join(', ')}`);

// ---------- the repeat curve read from the trace of R
console.log('\n=== supplementary (not part of the verdict): ratio with S_sat(1e-6), upper');
const r6 = ok.filter((r) => r.S6 !== null).map((r) => r.SR / r.S6);
const r6hi = ok.filter((r) => r.n >= 46 && r.S6 !== null).map((r) => r.SR / r.S6);
console.log('ratio S_R / S_sat(1e-6): min ' + Math.min(...r6).toFixed(4) + ', max ' + Math.max(...r6).toFixed(4) + ', spread ' + (Math.max(...r6) - Math.min(...r6)).toFixed(4) + '; n >= 46 only: min ' + Math.min(...r6hi).toFixed(4) + ', max ' + Math.max(...r6hi).toFixed(4));
console.log('\n=== E1: S_R, S_sat(1e-7), S_sat(1e-6) divided by pi L*_member (upper)');
console.log('n | L*_member | pi L* | S_R/(pi L*) | S_sat(1e-7)/(pi L*) | S_sat(1e-6)/(pi L*) | u_R/S_R');
for (const r of upper) {
  if (r.status !== 'ok') continue;
  const pl = Math.PI * r.Lm;
  console.log([r.n, r.Lm.toFixed(5), pl.toFixed(4), (r.SR / pl).toFixed(5), (r.Ssat / pl).toFixed(5), r.S6 === null ? '-' : (r.S6 / pl).toFixed(5), (r.uR / r.SR).toExponential(1)].join(' | '));
}
const e1 = ok.map((r) => r.SR / (Math.PI * r.Lm));
console.log('S_R / (pi L*): min ' + Math.min(...e1).toFixed(5) + ', max ' + Math.max(...e1).toFixed(5) + '; largest |S_R - pi L*| / u_R: ' + Math.max(...ok.map((r) => Math.abs(r.SR - Math.PI * r.Lm) / Math.max(r.uR, 1e-12))).toFixed(2));
const e1b = ok.filter((r) => r.S6 !== null && r.n <= 45).map((r) => r.S6 / (Math.PI * r.Lm));
console.log('S_sat(1e-6) / (pi L*), n <= 45: min ' + Math.min(...e1b).toFixed(5) + ', max ' + Math.max(...e1b).toFixed(5));

console.log('\n=== E2: slope along the satellite curve in ten equal steps of the rotation from -eps_n to the zero, divided by pi x mean L* of the two points');
for (const n of [5, 12, 20, 36, 56]) {
  const r = upper.find((q) => q.n === n && q.status === 'ok');
  if (!r || !r.zeroPt) { console.log('n = ' + n + ': no zero'); continue; }
  const c = r.curve, p0 = c[0], eps = -p0.turns;
  const iz = c.findIndex((p, k) => k > 0 && p.turns >= 0);
  const lv = Array.from({ length: 11 }, (_, k) => -eps + (k * eps) / 10);
  const pts = lv.map((l, k) => (k === 0 ? 0 : c.findIndex((p, j) => j > 0 && p.turns >= l)));
  const out = [];
  for (let k = 0; k < 10; k++) {
    const a = c[pts[k]], b = c[pts[k + 1]];
    if (pts[k + 1] < 0 || b.turns === a.turns) { out.push('-'); continue; }
    const sl = Math.abs((b.Tstar - a.Tstar) / (b.turns - a.turns)), Lm = (a.Lstar + b.Lstar) / 2;
    out.push((sl / (Math.PI * Lm)).toFixed(3));
  }
  console.log('n = ' + n + ' (eps ' + eps.toExponential(2) + ', zero at curve point ' + iz + ' of ' + c.length + ', L* from ' + p0.Lstar.toFixed(4) + ' to ' + (c[iz] ? c[iz].Lstar.toFixed(4) : '-') + '): ' + out.join(' '));
}
