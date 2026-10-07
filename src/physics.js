// 3 body problem, equal masses, G = 1, 2d
// state = [x0,y0,x1,y1,x2,y2, vx0,vy0,vx1,vy1,vx2,vy2]

const N_STATE = 12;

export function deriv(s, out) {
  for (let i = 0; i < 6; i++) out[i] = s[6 + i];
  out[6] = out[7] = out[8] = out[9] = out[10] = out[11] = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const dx = s[2 * j] - s[2 * i];
      const dy = s[2 * j + 1] - s[2 * i + 1];
      const r2 = dx * dx + dy * dy;
      const inv = 1 / (r2 * Math.sqrt(r2));
      const fx = dx * inv;
      const fy = dy * inv;
      out[6 + 2 * i] += fx;
      out[7 + 2 * i] += fy;
      out[6 + 2 * j] -= fx;
      out[7 + 2 * j] -= fy;
    }
  }
}

// start like Suvakov-Dmitrasinovic: bodies 1,2 at (-1,0),(1,0), 3 in the middle.
// body 1 gets (v1,v2), body 2 gets (v1,v2+ell), body 3 gets minus the sum so momentum is 0.
// total angular momentum works out to ell, so ell = 0 is the old zero-L plane
export function sdInitial(v1, v2, ell = 0) {
  return Float64Array.from([-1, 0, 1, 0, 0, 0, v1, v2, v1, v2 + ell, -2 * v1, -2 * v2 - ell]);
}

// Dormand-Prince 5(4) coefficients
const A = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
const B5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0];
const B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];

const K = Array.from({ length: 7 }, () => new Float64Array(N_STATE));
const tmp = new Float64Array(N_STATE);

// one adaptive step, changes s in place, returns [dt taken, next h]
export function dp45Step(s, h, rtol, atol, hMax) {
  for (let rej = 0; ; rej++) {
    // blew up (nan / collision), give up so we dont loop forever
    if (rej > 60 || !(h > 1e-14)) return [0, 1e-3];
    deriv(s, K[0]);
    for (let st = 1; st < 7; st++) {
      for (let i = 0; i < N_STATE; i++) {
        let acc = 0;
        for (let j = 0; j < st; j++) acc += A[st][j] * K[j][i];
        tmp[i] = s[i] + h * acc;
      }
      deriv(tmp, K[st]);
    }
    let err = 0;
    for (let i = 0; i < N_STATE; i++) {
      let hi5 = 0;
      let hi4 = 0;
      for (let j = 0; j < 7; j++) {
        hi5 += B5[j] * K[j][i];
        hi4 += B4[j] * K[j][i];
      }
      const y5 = s[i] + h * hi5;
      const sc = atol + rtol * Math.max(Math.abs(s[i]), Math.abs(y5));
      const e = (h * (hi5 - hi4)) / sc;
      err += e * e;
      tmp[i] = y5;
    }
    err = Math.sqrt(err / N_STATE);
    if (!Number.isFinite(err)) { h *= 0.1; continue; }
    if (err <= 1) {
      for (let i = 0; i < N_STATE; i++) s[i] = tmp[i];
      const fac = err === 0 ? 5 : Math.min(5, Math.max(0.2, 0.9 * Math.pow(err, -0.2)));
      return [h, Math.min(h * fac, hMax)];
    }
    h *= Math.max(0.1, 0.9 * Math.pow(err, -0.2));
  }
}

const PERMS = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
];

// distance between two states, bodies of b relabeled by perm
export function phaseDistance(a, b, perm) {
  let d = 0;
  for (let i = 0; i < 3; i++) {
    const k = perm[i];
    for (let c = 0; c < 2; c++) {
      const dp = a[2 * i + c] - b[2 * k + c];
      const dv = a[6 + 2 * i + c] - b[6 + 2 * k + c];
      d += dp * dp + dv * dv;
    }
  }
  return Math.sqrt(d);
}

// closest the orbit gets back to its start between tMin and tMax -> {d, t, perm}
export function bestReturn(s0, tMax, opts = {}) {
  const { tMin = 1, rtol = 1e-11, atol = 1e-12, hMax = 0.01 } = opts;
  const s = Float64Array.from(s0);
  let t = 0;
  let h = 1e-3;
  let best = { d: Infinity, t: 0, perm: 0 };
  // last 3 samples per perm for the parabola fit
  const hist = PERMS.map(() => []);
  for (let n = 0; t < tMax; n++) {
    if (n > 3e6) break;
    const [dt, hn] = dp45Step(s, Math.min(h, tMax - t), rtol, atol, hMax);
    t += dt;
    h = hn;
    if (t < tMin) continue;
    for (let p = 0; p < PERMS.length; p++) {
      const d = phaseDistance(s, s0, PERMS[p]);
      const hs = hist[p];
      hs.push([t, d * d]); // fit d^2, plain d is V shaped at the min
      if (hs.length > 3) hs.shift();
      if (hs.length === 3 && hs[1][1] <= hs[0][1] && hs[1][1] <= hs[2][1]) {
        // parabola through the 3 points (time measured from the middle one)
        const u0 = hs[0][0] - hs[1][0];
        const u2 = hs[2][0] - hs[1][0];
        const f0 = hs[0][1];
        const f1 = hs[1][1];
        const f2 = hs[2][1];
        const A2 = (f0 * u2 - f2 * u0 - f1 * (u2 - u0)) / (u0 * u2 * (u0 - u2));
        const B2 = (f2 - f1 - A2 * u2 * u2) / u2;
        let tt = hs[1][0];
        let dd = Math.sqrt(f1);
        if (A2 > 0) {
          const u = -B2 / (2 * A2);
          if (u >= u0 && u <= u2) {
            tt += u;
            dd = Math.sqrt(Math.max(0, f1 + B2 * u + A2 * u * u));
          }
        }
        if (dd < best.d) best = { d: dd, t: tt, perm: p };
      }
    }
  }
  return best;
}

// nelder-mead on (v1,v2) to minimize the return distance
export function refine(v1, v2, tMax, opts = {}) {
  // NM stalls on this cone shaped landscape so restart it with a smaller simplex
  let best = refineOnce(v1, v2, tMax, { ...opts, step: opts.step ?? 2e-3 });
  let step = (opts.step ?? 2e-3) / 4;
  for (let r = 0; r < (opts.restarts ?? 8) && best.d > 1e-9; r++, step /= 4) {
    const next = refineOnce(best.v1, best.v2, tMax, { ...opts, step });
    if (next.d < best.d) best = next;
  }
  return best;
}

function refineOnce(v1, v2, tMax, opts = {}) {
  const { iters = 80, step = 2e-3, tol = 1e-10, ell = 0 } = opts;
  const f = (p) => bestReturn(sdInitial(p[0], p[1], ell), tMax, opts);
  let simplex = [
    [v1, v2],
    [v1 + step, v2],
    [v1, v2 + step],
  ].map((p) => ({ p, r: f(p) }));
  for (let it = 0; it < iters; it++) {
    simplex.sort((a, b) => a.r.d - b.r.d);
    if (simplex[2].r.d - simplex[0].r.d < tol && simplex[0].r.d < 1e-6) break;
    const cx = (simplex[0].p[0] + simplex[1].p[0]) / 2;
    const cy = (simplex[0].p[1] + simplex[1].p[1]) / 2;
    const w = simplex[2];
    const mk = (k) => {
      const p = [cx + k * (cx - w.p[0]), cy + k * (cy - w.p[1])];
      return { p, r: f(p) };
    };
    const refl = mk(1);
    if (refl.r.d < simplex[0].r.d) {
      const exp = mk(2);
      simplex[2] = exp.r.d < refl.r.d ? exp : refl;
    } else if (refl.r.d < simplex[1].r.d) {
      simplex[2] = refl;
    } else {
      const con = mk(refl.r.d < w.r.d ? 0.5 : -0.5);
      if (con.r.d < Math.min(w.r.d, refl.r.d)) {
        simplex[2] = con;
      } else {
        const b = simplex[0];
        for (let i = 1; i < 3; i++) {
          const p = [(simplex[i].p[0] + b.p[0]) / 2, (simplex[i].p[1] + b.p[1]) / 2];
          simplex[i] = { p, r: f(p) };
        }
      }
    }
  }
  simplex.sort((a, b) => a.r.d - b.r.d);
  const best = simplex[0];
  return { v1: best.p[0], v2: best.p[1], ...best.r };
}

// positions for drawing, 6 floats per frame
export function sampleOrbit(s0, duration, frames) {
  const s = Float64Array.from(s0);
  const out = new Float32Array(frames * 6);
  let t = 0;
  let h = 1e-3;
  for (let f = 0; f < frames; f++) {
    const target = (duration * f) / (frames - 1);
    while (t < target - 1e-12) {
      const [dt, hn] = dp45Step(s, Math.min(h, target - t), 1e-10, 1e-12, 0.01);
      t += dt;
      h = hn;
    }
    for (let i = 0; i < 6; i++) out[f * 6 + i] = s[i];
  }
  return out;
}
