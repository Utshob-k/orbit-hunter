# SPDX-License-Identifier: MIT
# what the corrector does during the creep of a trace, from its per-attempt records (OUT.json.diag.jsonl of tools/family-follow-ias.mjs) and its compact trace file (data/deep/traces/<name>.json).
# The creep rule (on the accepted steps, the recorded points and the unrecorded steps of the trace in the order of the loop step; d_k = |lam_(k+1) - lam_k|): m0 is the median of the first 500 d_k;
# the trace creeps if the median of its last 500 d_k is at most m0 / 100 AND there is a start: the creep starts at the smallest accepted step k such that at least one window of 100 consecutive
# d_j starts at or after k (j >= k) and the median of every such window is at most m0 / 100. If the last window of 100 is already above m0 / 100 there is no start and the trace does not creep
# (no window at the end is not a vacuous truth). Fewer than 1000 accepted steps: no creep rule.
# For a stretch of loop steps (the creep: from the loop step of its start to the end; before: the 500 loop steps before that, or all of them if there are fewer) the file gives: the attempts by outcome
# ('accepted' or the outcome of the corrector or the continuation, with the reason of a failed corrector), the best residual reached in an attempt (the smallest of the residuals at the start of
# the Newton iterations) against the tolerance, the arclength step h of the attempts, the number of accepted steps that go backwards in lam, and the corrector time (the seconds of the attempts).
#   python tools/creep-attempts.py OUT.json LABEL=TRACE.json,DIAG.jsonl [LABEL=...]       OUT.json must be new. The tolerance of the corrector is read as 1e-11 (settings.newton of the run).
import sys, os, json, statistics

TOL = 1e-11


def accepted_steps(tr):
    return sorted(tr['points'] + tr.get('unrecorded', tr.get('unrec', [])), key=lambda e: e['step'])


def creep_start(d):
    # returns (creeps, k) with k the 0-based index of the first d_k of the creep, or (False, None); see the rule in the header
    if len(d) < 1000: return False, None
    m0 = statistics.median(d[:500])
    if not statistics.median(d[-500:]) <= m0 / 100: return False, None
    last_bad = -1
    for j in range(len(d) - 99):
        if statistics.median(d[j:j + 100]) > m0 / 100: last_bad = j
    k = last_bad + 1
    if k > len(d) - 100: return False, None
    return True, k


def q(a):
    if not a: return None
    a = sorted(a); n = len(a)
    return dict(n=n, min=a[0], p10=a[int(0.1 * (n - 1))], median=statistics.median(a), p90=a[int(0.9 * (n - 1))], max=a[-1])


def stretch(rows, lo, hi, dirn, lam0):
    # the attempts with lo <= loop step <= hi
    sel = [r for r in rows if lo <= r['step'] <= hi]
    outc = {}
    for r in sel:
        k = r['outcome'] + (' (' + r['why'] + ')' if r.get('why') else ''); outc[k] = outc.get(k, 0) + 1
    best = [min(r['resid']) for r in sel if r.get('resid')]
    failed_best = [min(r['resid']) for r in sel if r['outcome'] != 'accepted' and r.get('resid')]
    acc = [r for r in rows if r['outcome'] == 'accepted']
    back = 0; n_acc = 0
    for i, r in enumerate(acc):
        p = acc[i - 1]['lamNew'] if i else lam0
        if lo <= r['step'] <= hi:
            n_acc += 1
            if (r['lamNew'] - p) * dirn < 0: back += 1
    near = sum(1 for b in failed_best if TOL < b <= 10 * TOL)
    return dict(loop_steps=[lo, hi], attempts=len(sel), outcomes=outc, accepted=n_acc, accepted_going_backwards_in_lam=back, best_residual_all_attempts=q(best), best_residual_failed_attempts=q(failed_best),
                failed_attempts_with_best_residual_between_tol_and_10_tol=near, failed_attempts=len(failed_best), h_all_attempts=q([r['h'] for r in sel]), h_accepted=q([r['h'] for r in sel if r['outcome'] == 'accepted']),
                h_failed=q([r['h'] for r in sel if r['outcome'] != 'accepted']), seconds=sum(r.get('seconds', 0) for r in sel), newton_iterations_accepted=q([r['iters'] for r in sel if r['outcome'] == 'accepted']))


def main():
    out = sys.argv[1]
    if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    res = {}
    for spec in sys.argv[2:]:
        label, files = spec.split('=', 1); tf, df = files.split(',', 1)
        tr = json.load(open(tf)); rows = [json.loads(l) for l in open(df) if l.strip()]
        el = accepted_steps(tr); lam = [e['lam'] for e in el]; d = [abs(lam[k + 1] - lam[k]) for k in range(len(lam) - 1)]
        dirn = tr.get('direction', -1); dirn = -1 if (dirn == -1 or str(dirn).startswith('-')) else 1
        creeps, k = creep_start(d)
        item = dict(trace=label, accepted_steps=len(el), attempts=len(rows), direction=dirn, creeps=creeps, tolerance=TOL)
        if d: item.update(median_first_500=statistics.median(d[:500]), median_last_500=statistics.median(d[-500:]))
        if creeps:
            ls = el[k]['step']; last = rows[-1]['step']
            item.update(creep_start_accepted=k + 1, creep_start_loop_step=ls, steps_before=k, steps_after=len(el) - k)
            item['creep'] = stretch(rows, ls, last, dirn, lam[0]); item['before'] = stretch(rows, max(1, ls - 500), ls - 1, dirn, lam[0])
            sb = sum(r.get('seconds', 0) for r in rows if r['step'] < ls); sa = sum(r.get('seconds', 0) for r in rows if r['step'] >= ls)
            item['corrector_seconds'] = dict(before_creep=sb, from_creep_start=sa, share_from_creep_start=sa / (sa + sb))
            a_last = [r for r in rows if r['outcome'] == 'accepted'][-500:]
            item['last_500_accepted_backwards_in_lam'] = sum(1 for i in range(1, len(a_last)) if (a_last[i]['lamNew'] - a_last[i - 1]['lamNew']) * dirn < 0)
        res[label] = item
        print(label, 'creeps', creeps, 'start', item.get('creep_start_loop_step'), 'attempts', len(rows), flush=True)
    json.dump(dict(what='the corrector during the creep of the traces, from the per-attempt records (tools/creep-attempts.py; the rule is in the header of the tool)', traces=res), open(out, 'x'), indent=1)


main()
