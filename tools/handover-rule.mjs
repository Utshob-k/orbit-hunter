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
