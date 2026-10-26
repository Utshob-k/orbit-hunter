// the 12 x 12 matrix of src/ias/reg.js (flowEnc with jac: true, the derivative of the end state of a piece with respect to its start state) on the six encounter pieces of the stored points
// t35 - steps 1 and 10 and t44 - step 34 (data/deep/extra/reg-matrix-pieces.json, closest approach of the pair from 4e-4 down to 7e-10), two ways: (1) central differences of the end states of
// flowEnc with the step h = 1e-6 and 2h, combined by Richardson extrapolation; PASS if the largest |M - M_fd| is at most 1e-8 max|M|. (2) the matrix has to be symplectic (masses 1, so the velocities
// are the momenta): the largest |M^T Omega M - Omega| with Omega = [[0, I], [-I, 0]] (positions first, then velocities) is at most 1e-10 max|M|^2. Stored values on the machine of the run: the
// difference at most 1.1e-9 max|M|, the defect at most 2.3e-12 max|M|^2. No Python needed, takes a few seconds.
import fs from 'fs';
import { flowEnc } from '../src/ias/reg.js';

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };
const t00 = Date.now();
const settings = JSON.parse(fs.readFileSync(new URL('../src/ias/reg-settings.json', import.meta.url), 'utf8'));
const data = JSON.parse(fs.readFileSync(new URL('../data/deep/extra/reg-matrix-pieces.json', import.meta.url), 'utf8'));
const omega = (a, b) => (a < 6 && b === a + 6 ? 1 : a >= 6 && b === a - 6 ? -1 : 0);
const endAt = (x, tau) => { const r = flowEnc(x, tau, { jac: false, settings }); if (!r.ok) throw new Error('reg.js did not finish: ' + r.reason); return r.end; };
for (const p of data.pieces) {
  const r = flowEnc(p.start, p.tau, { jac: true, settings });
  if (!r.ok) { check(`${p.id}: the flow finishes`, false, r.reason); continue; }
  const M = r.M; let maxM = 0; for (const v of M) maxM = Math.max(maxM, Math.abs(v));
  const h = 1e-6; let diff = 0;
  for (let q = 0; q < 12; q++) {
    const at = (d) => { const x = p.start.slice(); x[q] += d; return endAt(x, p.tau); };
    const ep = at(h), em = at(-h), ep2 = at(2 * h), em2 = at(-2 * h);
    for (let k = 0; k < 12; k++) {
      const d1 = (ep[k] - em[k]) / (2 * h), d2 = (ep2[k] - em2[k]) / (4 * h);
      diff = Math.max(diff, Math.abs(M[k * 12 + q] - (4 * d1 - d2) / 3));
    }
  }
  let defect = 0;
  for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) {
    let v = 0;
    for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) { const o = omega(i, j); if (o !== 0) v += M[i * 12 + a] * o * M[j * 12 + b]; }
    defect = Math.max(defect, Math.abs(v - omega(a, b)));
  }
  check(`${p.id}: matrix equals central differences with Richardson (h = 1e-6)`, diff <= 1e-8 * maxM, `closest approach ${r.minD1.toExponential(2)} max|M|=${maxM.toExponential(2)} difference/max|M|=${(diff / maxM).toExponential(2)}`);
  check(`${p.id}: matrix is symplectic`, defect <= 1e-10 * maxM * maxM, `defect/max|M|^2=${(defect / (maxM * maxM)).toExponential(2)}`);
}
console.log(`time ${((Date.now() - t00) / 1000).toFixed(1)} s`);
process.exit(fail ? 1 : 0);
