// SPDX-License-Identifier: MIT
// the verdict of tools/reproduce-trace.mjs: does a run follow a stored trace of data/deep/traces/? (a module of its own so that test/handover-fail.test.js can test it without a run)
// traceVerdict({ n, stepDiff, missing, maxRel, gotLength, refLength, why, whyBeforeHandover, storedWhy, stopAfter, handover }) returns { lenOk, whyOk, ok }.
//   n: the number of compared steps; stepDiff and missing: compared steps with another step number / without values; maxRel: the largest relative difference of lam, u1, u2, t;
//   gotLength, refLength: the accepted steps of the run and of the stored trace; why, whyBeforeHandover: the stop reason of the run (and the one before the hand-over); storedWhy: the stop reason
//   of the stored trace; stopAfter: N of --stop-after=N or null; handover: true if --handover was given.
//   Without --stop-after and --handover: as many accepted steps as the stored trace and the same stop reason. With --stop-after=N (no --handover): stopped after N recorded points or with the stored reason.
//   With --handover: handed over at a step inside the stored trace (at most as many accepted steps as the stored trace), or the stored reason at the stored length, or the trace reproduced up to
//   the stored stop (whyBeforeHandover equal to the stored reason, as many accepted steps as the stored trace) and the hand-over tried there, whatever its result.
//   ok: n > 0, no step number differs, no step without values, maxRel below 1e-9, and lenOk and whyOk.
export const HANDED_OVER = 'handed over to the 50 digit continuation';

export function traceVerdict({ n, stepDiff, missing, maxRel, gotLength, refLength, why, whyBeforeHandover, storedWhy, stopAfter, handover }) {
  const lenOk = stopAfter === null && !handover ? gotLength === refLength : true;
  const whyOk = handover ? ((why === HANDED_OVER && gotLength <= refLength) || (why === storedWhy && gotLength === refLength) || (whyBeforeHandover === storedWhy && gotLength === refLength))
    : stopAfter === null ? why === storedWhy : (why === 'stopped after ' + stopAfter + ' recorded points' || why === storedWhy);
  const ok = n > 0 && stepDiff === 0 && missing === 0 && maxRel < 1e-9 && lenOk && whyOk;
  return { lenOk, whyOk, ok };
}
