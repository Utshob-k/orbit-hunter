// SPDX-License-Identifier: MIT
// settings of the integrators and of the multiple shooting. One mutable object; the values below are the defaults of this release. The stored traces of t35 - and t12 + were run with the guard ratio 400 (column guard_ratio of data/deep/traces-table.csv), the others with the 390 below.
// integrator: 'dp45' (default, the Dormand-Prince code of physics.js) or 'ias' (REBOUND IAS15 through the Python process of src/ias/, with the
// regularised integrator of src/ias/reg.js for the encounter pieces). The environment variable ORBIT_INTEGRATOR=ias selects it from the shell.
const env = typeof process !== 'undefined' && process.env ? process.env : {};

export const settings = {
  integrator: env.ORBIT_INTEGRATOR === 'ias' ? 'ias' : 'dp45',
  newton: 1e-11,                          // stopping tolerance of the multiple shooting residual (closePerpMS, correct)
  rtol: 1e-13, atol: 1e-14, hMax: 0.01,   // dp45 flow of shooting.js and perp.js
  mrtol: 1e-12, matol: 1e-13,             // dp45 variational equations (monodromy) of stability.js
  observer: null,                         // optional recorder of the corrector and of the continuation (src/ias/recorder.js)
  ias: {
    adaptiveMode: 2,                      // IAS15 adaptive_mode of REBOUND
    firstStep: 'timescale',               // first step of IAS15 on a piece: 'timescale' sets sim.dt = firstStepFactor * the smallest d / |v_rel| of the three pairs at the start of the piece (at most the piece length); 'legacy' leaves REBOUND's default 0.001, which is what every stored run used
    firstStepFactor: 0.01,
    python: env.ORBIT_PYTHON || (typeof process !== 'undefined' && process.platform === 'win32' ? 'python' : 'python3'),
    timeoutMs: 1800000,                   // longest wait for one answer of the Python process (30 minutes); a timeout is a failed attempt
    guardRatio: 390,                      // guard G1b trips if d2 < guardRatio * d1 at the pericentre of an encounter piece (d1, d2: the two smaller pair distances)
    crossCheckBelow: 0.05,                // an unflagged piece with a pair distance below this is also computed with reg.js
    crossCheckDiff: 3e-12,                // and reg.js replaces IAS15 where the end states differ by this much or more
  },
};
