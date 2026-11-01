# SPDX-License-Identifier: MIT
# Cost of PeriCont and of the 50 digit natural continuation counted the same way, on the same stretch of lam, for t35 - and t44 -. Two countings:
#  (i) without bookkeeping: 50 digit = sum of the step seconds of the continuation / lam covered (steps x |step|); PeriCont = corrector seconds of the accepted steps 1..H of a replay of the stored trace
#      (the per-attempt records of the replay), counted as tools/creep-attempts.py counts them, / |lam_H - lam_1|. H = the accepted step at which the hand-over rule fires (262 and 286).
#  (ii) the whole run: 50 digit = wall seconds of the re-closing of the start orbit + of the continuation / |lam of the last orbit - lam of the start|; PeriCont = wall seconds of the replay job / |lam_H - lam_0|
#      (lam_0 = lam of the start of the run).
# The 50 digit cost of a family is the run with the largest step at which every step converged. Same-branch checks (the script stops without writing when one fails): the first orbit of the run with two steps against the
# stored trace (linear in lam) to 1e-4 relative, the last orbit of every converged run against the 50 digit hand-over steps of handover.json (quadratic through the three nearest in lam) to 1e-8 relative.
# Also: orbits per second of both sides, the load during every job (from the load log), the spread of the timing of the same PeriCont steps, the route of the hand-over as measured, the break-even P100 of the hand-over rule.
# Inputs: the release (data/deep/traces/<label>.json, extra/cost-before-floor.json, extra/handover.json) and the files of the runs, which are in the raw deposit, not in the package: the outputs and the time files of
# tools/reclose.py and tools/reclose-continue.py, the output of tools/reproduce-trace.mjs with its .diag.jsonl and its time file, and the load log. INPUTS.json names them (paths as keys, see the data file).
#   python tools/cost-same-conditions.py REL INPUTS.json OUT.json       REL = the repository folder; OUT.json must be new
# INPUTS.json: {"load_log": PATH, "leave_out_process_names": [NAMES] (optional: processes of the tool that started the jobs are not listed in the load), "families": {"t35m": {"start": PATH, "start_time": PATH, "runs": [{"dir": FOLDER, "time": PATH, "step": -7.5e-4, "steps_asked": 2}, ...], "replay": PATH, "replay_time": PATH}, "t44m": {...}}}
import sys, os, json, math, bisect, statistics
BS = chr(92)
REL = sys.argv[1].replace(BS, '/').rstrip('/') + '/'
INP, OUT = sys.argv[2], sys.argv[3]
if os.path.exists(OUT): sys.exit('exists, not overwriting: ' + OUT)
L = lambda p: json.load(open(p, encoding='utf8'))
D = REL + 'data/deep/'
inp = L(INP)
cbf, ho = L(D + 'extra/cost-before-floor.json'), L(D + 'extra/handover.json')

def clock(path):
    f = open(path).read().split()
    return dict(seconds=float(f[0]), exit=int(f[1]), start=f[2] + ' ' + f[3], end=f[4] + ' ' + f[5])

def curve_of(el):
    return sorted((e['lam'], e['u1'], e['u2'], e['t']) for e in el)

def interp(curve, lam):
    ks = [c[0] for c in curve]
    if lam < ks[0] or lam > ks[-1]: return None
    i = min(max(bisect.bisect_left(ks, lam), 1), len(ks) - 1); a, b = curve[i - 1], curve[i]
    w = (lam - a[0]) / (b[0] - a[0]) if b[0] != a[0] else 0.0
    return [a[j] + w * (b[j] - a[j]) for j in (1, 2, 3)]

def quad(pts, lam):
    # quadratic through the three points nearest in lam (Lagrange), for u1, u2, t
    q = sorted(pts, key=lambda p: abs(p[0] - lam))[:3]
    out = []
    for c in (1, 2, 3):
        s = 0.0
        for i in range(3):
            w = 1.0
            for j in range(3):
                if j != i: w *= (lam - q[j][0]) / (q[i][0] - q[j][0])
            s += w * q[i][c]
        out.append(s)
    return out

def reldiff(a, b): return [abs(x - y) / abs(y) for x, y in zip(a, b)]

def load_log(path):
    rows = []
    for l in open(path, encoding='utf8'):
        f = l.rstrip('\n').split('\t')
        if len(f) < 3 or f[1] == 'error': continue
        try: ld = float(f[1])
        except ValueError: continue
        procs = []
        for e in f[2].split(' | '):
            p = e.split(' ')
            if len(p) == 3 and p[2].startswith('+'): procs.append((int(p[0]), p[1], float(p[2][1:])))
        rows.append((f[0], ld, procs))
    return rows

LEAVE_OUT = set(inp.get('leave_out_process_names', []))
def load_during(rows, c):
    sel = [r for r in rows if c['start'] <= r[0] <= c['end']]
    if not sel: return dict(samples=0)
    tot = {}
    for r in sel:
        for pid, name, g in r[2]:
            if name in LEAVE_OUT: continue
            tot[(pid, name)] = tot.get((pid, name), 0.0) + g
    top = sorted(tot.items(), key=lambda kv: -kv[1])[:6]
    return dict(samples=len(sel), load_median=statistics.median(r[1] for r in sel), load_max=max(r[1] for r in sel),
                processes_cpu_seconds_gained_in_the_window=[dict(pid=k[0], name=k[1], seconds=round(v, 1)) for k, v in top])

def secs_to(rows, el, k):
    # as tools/creep-attempts.py counts the stretch: all attempts with a loop step below the loop step of the (k+1)-th accepted step; rows of a replay end at the k-th
    lim = el[k]['step'] if k < len(el) else rows[-1]['step'] + 1
    return sum(r.get('seconds', 0) for r in rows if r['step'] < lim)

def path(pts): return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))

LOG = load_log(inp['load_log'])
res = dict(what='', commands=[], inputs={}, families={})
stop = []
for label in ('t35m', 't44m'):
    cfg = inp['families'][label]
    tr = L(D + 'traces/%s.json' % label)
    el = sorted(tr['points'] + tr['unrecorded'], key=lambda e: e['step'])
    k_end = cbf['families'][label]['stretch_end_step']
    curve = curve_of(el[:k_end])
    lam_0, lam_1 = tr['start']['lam'], el[0]['lam']
    hv = ho['checks']['traces'][label]; hrun = ho['runs'][label]
    hand = [(float(s['lam']), float(s['u1']), float(s['u2']), float(s['t'])) for s in hrun['handover']['steps']]
    # ---- the replay
    rows = [json.loads(l) for l in open(cfg['replay'] + '.diag.jsonl', encoding='utf8') if l.strip()]
    acc = [r for r in rows if r['outcome'] == 'accepted']
    # the replay stops at a recorded point before the driver notes the last step as accepted: the last row (outcome 'tangent ok', converged) is the H-th accepted step
    if rows[-1]['outcome'] == 'tangent ok' and rows[-1].get('ok'): acc.append(dict(rows[-1], lamNew=None))
    H = len(acc)
    assert H == hv['a_rule']['accepted_step'], (label, H)
    assert [r['step'] for r in acc] == [e['step'] for e in el[:H]], 'loop steps of the replay differ from the stored trace'
    assert all(r['lamNew'] == e['lam'] for r, e in zip(acc, el) if r['lamNew'] is not None), 'lam of the replay differs from the stored trace'
    assert rows[-1]['step'] == acc[-1]['step'], 'the replay has attempts after the H-th accepted step'
    rclock = clock(cfg['replay_time'])
    sec_corr = secs_to(rows, el, H)
    pts = [(e['u1'], e['u2'], e['t'], e['lam']) for e in el]
    lam_H = el[H - 1]['lam']
    lam_cov_p = abs(lam_H - lam_1)
    pp = path(pts[:H])
    # ---- the 50 digit runs
    sclock = clock(cfg['start_time']); start = L(cfg['start'])
    runs = []
    for rn in cfg['runs']:
        cj = L(rn['dir'].rstrip('/') + '/%s_continue.json' % label)
        rws = cj['steps']; ok = [s for s in rws if s['converged']]
        step = abs(float(cj['dlam']))
        assert abs(step - abs(rn['step'])) < 1e-12
        lam0 = float(cj['lam0'])
        orbits = []
        for s in ok:
            o = L(rn['dir'].rstrip('/') + '/%s_s%02d.out.json' % (label, s['step']))
            orbits.append((float(s['lam']), float(o['u1']), float(o['u2']), float(o['t'])))
        inc = [math.sqrt(sum(x * x for x in s['change_abs']) + step * step) for s in ok]
        secs = sum(s['seconds'] for s in ok)
        run = dict(step_dlam=-step if cj['dlam'].startswith('-') else step, steps_asked=rn['steps_asked'], steps_run=len(rws), steps_converged=len(ok), complete=(len(ok) == rn['steps_asked']),
                   updates_per_step=[s['updates'] for s in ok], residual_per_step=[s['residual'] for s in ok], seconds_per_step=[s['seconds'] for s in ok], seconds_of_the_steps=secs,
                   lam_start=lam0, lam_last=float(ok[-1]['lam']) if ok else None, lam_covered=len(ok) * step, path_length=sum(inc), clock=clock(rn['time']))
        if ok:
            first = interp(curve, orbits[0][0])
            run['first_orbit_against_the_stored_trace'] = dict(lam=orbits[0][0], relative_difference=reldiff(orbits[0][1:], first) if first else None)
            last = quad(hand, orbits[-1][0]) if hand[-1][0] <= orbits[-1][0] <= hand[0][0] else None
            run['last_orbit_against_the_handover_steps'] = dict(lam=orbits[-1][0], relative_difference=reldiff(orbits[-1][1:], last) if last else None)
        runs.append(run)
    full = [r for r in runs if r['complete'] and r['steps_converged']]
    if not full: sys.exit('STOP: no run of %s converged at every step' % label)
    ch = max(full, key=lambda r: abs(r['step_dlam']))
    # same-branch checks
    chk = {}
    two = [r for r in runs if r['steps_asked'] == 2 and r['complete']]
    for r in two:
        d = r['first_orbit_against_the_stored_trace']['relative_difference']
        chk['first_orbit_of_the_two_step_run_vs_stored_trace'] = dict(largest=max(d) if d else None, limit=1e-4, ok=bool(d) and max(d) <= 1e-4)
    for r in runs:
        if r['complete']:
            d = r['last_orbit_against_the_handover_steps']['relative_difference']
            chk['last_orbit_step_%g_vs_handover_steps' % abs(r['step_dlam'])] = dict(largest=max(d) if d else None, limit=1e-8, ok=bool(d) and max(d) <= 1e-8)
    if not all(v['ok'] for v in chk.values()):
        print(json.dumps(chk, indent=1)); sys.exit('STOP: a same-branch check failed for ' + label)
    # ---- counting (i) and (ii)
    cs = [r for r in runs if r is ch][0]
    i_50 = cs['seconds_of_the_steps'] / cs['lam_covered']
    i_p = sec_corr / lam_cov_p
    ii_50 = (sclock['seconds'] + cs['clock']['seconds']) / abs(cs['lam_last'] - cs['lam_start'])
    ii_p = rclock['seconds'] / abs(lam_H - lam_0)
    arc_50 = cs['seconds_of_the_steps'] / cs['path_length']
    arc_p = sec_corr / pp
    ratios = dict(count_i_per_unit_lam=i_50 / i_p, count_i_per_unit_arclength=arc_50 / arc_p, count_ii_per_unit_lam=ii_50 / ii_p)
    stop += [(label, k, v) for k, v in ratios.items() if k != 'count_i_per_unit_arclength' and v > 1.25]
    # ---- orbits per second, route, spread, break-even
    lamdots = [lam_0] + [e['lam'] for e in el]
    p100_first = abs(lamdots[0] - lamdots[100]) / 100
    rate50 = cs['lam_covered'] / cs['seconds_of_the_steps']
    route_pass = cs['lam_last'] <= hv['e_progress_and_time']['lam_last_of_the_stored_trace']
    alone = (sclock['seconds'] + cs['clock']['seconds']) if route_pass else None
    be = rate50 * rclock['seconds'] / H
    be_corr = rate50 * sec_corr / H
    res['families'][label] = dict(
        start_reclosing=dict(converged=start.get('converged'), residual=start.get('residual'), updates=len(start.get('iterations', [])) - 1, seconds_in_the_tool=start.get('elapsed_s'), clock=sclock),
        fifty_digit_runs=runs, chosen_fifty_digit_run=dict(step_dlam=cs['step_dlam'], steps=cs['steps_converged'], load=load_during(LOG, cs['clock'])),
        load_during_the_start_reclosing=load_during(LOG, sclock),
        pericont_replay=dict(accepted_steps=H, loop_steps_equal_to_the_stored_trace=True, attempts=len(rows), failed_attempts=len(rows) - H, corrector_seconds_of_steps_1_to_H=sec_corr, wall_seconds=rclock['seconds'], clock=rclock, load=load_during(LOG, rclock),
                             lam_0=lam_0, lam_1=lam_1, lam_H=lam_H, path_length_1_to_H=pp,
                             corrector_seconds_in_the_stored_run=cbf['families'][label]['boundaries']['H']['pericont']['corrector_seconds'],
                             seconds_double_precision_part_of_handover_json=hv['e_progress_and_time']['seconds_double_precision_part']),
        counts=dict(
            i_without_bookkeeping=dict(fifty_digit_seconds=cs['seconds_of_the_steps'], fifty_digit_lam_covered=cs['lam_covered'], fifty_digit_seconds_per_unit_lam=i_50, fifty_digit_seconds_per_unit_arclength=arc_50,
                                       pericont_corrector_seconds=sec_corr, pericont_lam_covered=lam_cov_p, pericont_seconds_per_unit_lam=i_p, pericont_seconds_per_unit_arclength=arc_p),
            ii_whole_run=dict(fifty_digit_seconds=sclock['seconds'] + cs['clock']['seconds'], fifty_digit_lam_covered=abs(cs['lam_last'] - cs['lam_start']), fifty_digit_seconds_per_unit_lam=ii_50,
                              pericont_wall_seconds=rclock['seconds'], pericont_lam_covered=abs(lam_H - lam_0), pericont_seconds_per_unit_lam=ii_p)),
        ratios_fifty_digit_over_pericont=ratios,
        orbits_per_second=dict(pericont_accepted_steps_per_wall_second=H / rclock['seconds'], fifty_digit_converged_orbits_per_continuation_wall_second=cs['steps_converged'] / cs['clock']['seconds']),
        same_branch_checks=chk,
        route=dict(handover_json_seconds_until_lam_last_is_passed=hv['e_progress_and_time']['seconds_until_lam_last_is_passed'], lam_last_of_the_stored_trace=hv['e_progress_and_time']['lam_last_of_the_stored_trace'],
                   chosen_run_passes_lam_last=route_pass, fifty_digit_alone_seconds_count_ii=alone, route_over_alone=(hv['e_progress_and_time']['seconds_until_lam_last_is_passed'] / alone) if alone else None),
        break_even=dict(fifty_digit_lam_per_second=rate50, pericont_wall_seconds_per_accepted_step=rclock['seconds'] / H, p100_break_even=be, p100_break_even_over_default_1e_7=be / 1e-7,
                        p100_break_even_with_corrector_seconds=be_corr, mean_step_in_lam_of_the_first_100_accepted_steps=p100_first))
    res['inputs'][label] = dict(trace='data/deep/traces/%s.json' % label, replay=os.path.basename(cfg['replay']), replay_attempts=os.path.basename(cfg['replay']) + '.diag.jsonl', replay_time=os.path.basename(cfg['replay_time']),
                                start=os.path.basename(cfg['start']), runs=[os.path.basename(r['dir'].rstrip('/')) for r in cfg['runs']])
res['stop_rule_ratios_above_1.25'] = stop
res['what'] = ('PeriCont and the 50 digit natural continuation counted the same way on the same stretch of lam, t35 - and t44 -: (i) without bookkeeping, (ii) the whole run; the 50 digit side is the run with the largest step at which every step converged, '
               'the PeriCont side the replay of the stored trace to the hand-over step H, run one after the other with the 50 digit jobs on one machine, the load recorded every 60 s. Also orbits per second, the route of the hand-over as measured in handover.json, and the break-even P100 of the hand-over rule.')
res['commands'] = ['python tools/reclose.py JOB OUT.json   (the start orbit: accepted step 1 of the stored trace)', 'python tools/reclose-continue.py LABEL START.json LAM0 OUTDIR --steps N --dlam STEP --no-witness',
                   'node tools/reproduce-trace.mjs LABEL OUT.json --stop-after=K   (K = recorded point of the hand-over step: 241 and 268)', 'python tools/cost-same-conditions.py REL INPUTS.json OUT.json   (the files of the runs are in the raw deposit)']
res['conditions'] = 'wall seconds on one machine (Windows 11, 12 logical processors); the jobs ran one after the other; the busiest other processes are listed with the load of every job' + (' (one process of the program that started the jobs is left out of that list)' if LEAVE_OUT else '')
json.dump(res, open(OUT, 'x', encoding='utf8'), indent=1)
print('written', OUT)
for label, f in res['families'].items():
    r, c = f['ratios_fifty_digit_over_pericont'], f['counts']
    print(label, 'chosen step', f['chosen_fifty_digit_run']['step_dlam'], '| (i) 50 digit %.4g s/lam, PeriCont %.4g | (ii) %.4g, %.4g | ratios i %.3f arc %.3f ii %.3f' % (c['i_without_bookkeeping']['fifty_digit_seconds_per_unit_lam'], c['i_without_bookkeeping']['pericont_seconds_per_unit_lam'], c['ii_whole_run']['fifty_digit_seconds_per_unit_lam'], c['ii_whole_run']['pericont_seconds_per_unit_lam'], r['count_i_per_unit_lam'], r['count_i_per_unit_arclength'], r['count_ii_per_unit_lam']))
if stop: print('STOP RULE: ratio above 1.25:', stop)
