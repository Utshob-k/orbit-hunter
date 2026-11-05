// SPDX-License-Identifier: MIT
// the rule of --handover of tools/family-follow-ias.mjs, on a list of lam values: lams[0] is the lam of the start, lams[k] the lam of the k-th accepted step.
// P100 = |lams[K] - lams[K - 100]| / 100 over the last 100 accepted steps (K = the number of accepted steps, at least 100, otherwise there is no value). The rule fires if P100 < below (1e-7 by default).
// Only the net change of lam over the last 100 accepted steps counts, in either direction; no wall time is used.
export const WINDOW = 100;

export function p100(lams) {
  const K = lams.length - 1;
  return K < WINDOW ? null : Math.abs(lams[K] - lams[K - WINDOW]) / WINDOW;
}

export function handoverFires(lams, below = 1e-7) {
  const p = p100(lams);
  return p !== null && p < below;
}

// The point behind the last one for the tangent of the hand-over: the first index j below K (the last index) with |lams[K] - lams[j]| >= minDlam, reached on a stretch where lam moves in one direction only.
// null if lam turns (or stands still) on the way back from K, if the start of the list is reached before the distance minDlam, or if the last step of lam is 0.
export function backIndex(lams, minDlam = 1e-6) {
  const K = lams.length - 1;
  if (K < 1) return null;
  const s = Math.sign(lams[K] - lams[K - 1]);
  if (s === 0) return null;
  for (let j = K - 1; j >= 0; j--) {
    if (Math.sign(lams[j + 1] - lams[j]) !== s) return null;
    if (Math.abs(lams[K] - lams[j]) >= minDlam) return j;
  }
  return null;
}

// The hand-over also starts at two stops of the trace: the triple-approach guard and "lost the family" (tools/family-follow-ias.mjs).
export function handoverAtStop(why) {
  return typeof why === 'string' && (why.startsWith('triple-approach guard') || why.includes('lost the family'));
}

// The "fired" object of the hand-over at a stop, from the last accepted step: lams[0] and pars[0] are the start, then every accepted step; steps[k] is the loop step of accepted step k (steps[0] = 0).
// null if there is no accepted step (lams has fewer than 2 entries). back is null if backIndex gives null (lam turns within the last 1e-6, or the trace is shorter).
export function firedAtStop(lams, pars, steps, below = 1e-7) {
  if (!lams || lams.length < 2) return null;
  const K = lams.length - 1, j = backIndex(lams);
  return { p100: p100(lams), below, accepted_steps: K, loop_step: steps[K], lam: lams[K], lam_step: lams[K] - lams[K - 1], u1: pars[K].u1, u2: pars[K].u2, t: pars[K].t, back: j === null ? null : { index: j, lam: lams[j], ...pars[j] } };
}
