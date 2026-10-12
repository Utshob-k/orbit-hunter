// the 8 end orbits of class I (n = 5 to 12) in one file: the 30 digit start values, T*, L*, the closure, the multipliers (multiple precision, tier A), the
// REBOUND closures and the symmetry class, from the files of data/class-i/ (refined/, stability/, rebound/, check/).
// node tools/class-i-partners.mjs [--write]    (a plain run prints the JSON; --write stores data/class-i/partner-orbits.json, the file must be new)
import fs from 'fs';
import { ROOT, read, classIRefined, classIStability } from './orbit-lookup.mjs';

const txt = (f) => fs.readFileSync(ROOT + 'data/class-i/' + f, 'utf8');
const orbits = [];
for (let n = 5; n <= 12; n++) {
  const ref = classIRefined(n), st = classIStability(n), r = st.result.R;
  const reb = txt(`rebound/n${n}.txt`), chk = txt(`check/n${n}.txt`);
  const dist = reb.match(/distance to the start state after k periods: k=1 (\S+), k=2 (\S+), k=5 (\S+), k=10 (\S+), k=20 (\S+)/);
  const drift = reb.match(/relative drift of E and L after 20 periods: (\S+), (\S+)/);
  const sym = chk.match(/SYMMETRY CLASS \(criterion a\): iso end orbit isosceles-only: (\w+); known orbit collinear-only: (\w+); iso orbit also collinear-perpendicular: (\w+); known orbit also isosceles: (\w+)/);
  if (!dist || !drift || !sym) throw new Error('could not read the REBOUND or check output of n = ' + n);
  const real = r.mu.filter((m) => Math.abs(+m.mod_minus_1) > 1e-6).map((m) => +m.re).sort((a, b) => a - b);
  const ell = r.mu.filter((m) => Math.abs(+m.mod_minus_1) <= 1e-6).map((m) => +m.angle).map((a) => Math.min(a, 1 - a))[0];
  orbits.push({
    n,
    start: { p: ref.p, w: ref.w, h: ref.h, t: ref.t },
    digits: ref.digits, residual: ref.residual, closure_full_period: ref.closure_full_period, Tstar: ref.Tstar, Lstar: ref.Lstar,
    multipliers: { precision: `${st.dps} digits, tolerance ${st.tol}, h = ${st.h}`, mp_closure: st.closure, mu: r.mu, real_pair: [real[1], real[0]], other_pair_angle_turns: ell, max_mod_dev: r.max_mod_dev, invariance_defect: r.invariance_defect_z },
    rebound: { closure_after_k_periods: { 1: +dist[1], 2: +dist[2], 5: +dist[3], 10: +dist[4], 20: +dist[5] }, relative_drift_E_L_after_20_periods: [+drift[1], +drift[2]] },
    symmetry_class: { end_orbit_isosceles_only: sym[1] === 'true', class_c_orbit_collinear_only: sym[2] === 'true', end_orbit_also_collinear_perpendicular: sym[3] === 'true', class_c_orbit_also_isosceles: sym[4] === 'true' },
  });
}
const out = JSON.stringify({
  what: 'the end orbits of the satellite curves of class I (the isosceles start of src/iso.js: body 0 at (1, 0), bodies 1 and 2 at (-1/2, h) and (-1/2, -h), velocities (0, w), (p, -w/2), (-p, -w/2); G = m = 1, relative period 2t, rotation 0) for the upper nu = 1/n, n = 5 to 12: start values with 30 digits, T* and L*, the closure of the full period, the four nontrivial multipliers in multiple precision (a real pair mu, 1/mu and a pair exp(+-2 pi i nu) on the unit circle), REBOUND closures (IAS15, double precision) and the symmetry class. built by tools/class-i-partners.mjs from the files of data/class-i/.',
  orbits,
}, null, 1);
if (process.argv.includes('--write')) {
  const f = ROOT + 'data/class-i/partner-orbits.json';
  if (fs.existsSync(f)) { console.error('refusing to overwrite ' + f); process.exit(2); }
  fs.writeFileSync(f, out);
  console.log('written data/class-i/partner-orbits.json');
} else console.log(out);
