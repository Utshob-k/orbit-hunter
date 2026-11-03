# SPDX-License-Identifier: MIT
# Cost of PeriCont and of the 50 digit natural continuation before the hand-over: the corrector seconds of the first k accepted steps of t35 - and t44 - from the per-attempt records of the stored runs, per unit of lam and of arclength,
# at three boundaries k (H: where the hand-over rule of tools/handover-rule.mjs fires with 1e-7; Q: the 99 % point of lambda-progress.json; B: the first k >= 100 at which the lam per PeriCont second of the last 100 accepted steps falls
# below the lam per second of the 50 digit continuation), against the 50 digit continuation over the same lam (the larger-step run of extra/cost-same-stretch.json), with the route and the break-even P100. Writes extra/cost-before-floor.json.
# Inputs: REL (the repository: data/deep/traces, extra/cost-comparison.json, cost-same-stretch.json, lambda-progress.json, handover.json, creep-attempts.json) and files that are in the raw deposit, not in the package:
# RAW/traces/<label>.diag.jsonl (the per-attempt records of the stored runs) and the *_continue.json of the larger-step 50 digit runs (they hold the change of (u1, u2, t) of every step, from which the arclength is taken). Needs node.
#   python tools/cost-before-floor.py REL RAW CONT_T35M CONT_T44M OUT.json      OUT.json must be new. First check: the corrector seconds of the accepted steps 1..1220 and 1..623, counted as tools/creep-attempts.py counts
#   them, must reproduce extra/cost-comparison.json to 0.1 s; if not the script prints both numbers and stops without writing.
import sys, os, json, math, subprocess, tempfile, pathlib
if len(sys.argv) < 6: sys.stderr.write('usage: python tools/cost-before-floor.py REL RAW CONT_T35M CONT_T44M OUT.json\n'); sys.exit(2)
BS = chr(92)
REL, RAW = [os.path.abspath(x).replace(BS, '/').rstrip('/') + '/' for x in sys.argv[1:3]]
C35, C44, OUT = sys.argv[3:6]
if os.path.exists(OUT): sys.exit('exists, not overwriting: ' + OUT)
L = lambda p: json.load(open(p, encoding='utf8'))
D = REL + 'data/deep/'
cc, cs, lp, ho, ca = L(D + 'extra/cost-comparison.json'), L(D + 'extra/cost-same-stretch.json'), L(D + 'extra/lambda-progress.json'), L(D + 'extra/handover.json'), L(D + 'extra/creep-attempts.json')
CONT = {'t35m': C35, 't44m': C44}
STRETCH = {'t35m': 1220, 't44m': 623}
BELOW = 1e-7

def load(label):
    tr = L(D + 'traces/%s.json' % label)
    rows = [json.loads(l) for l in open(RAW + 'traces/%s.diag.jsonl' % label, encoding='utf8') if l.strip()]
    el = sorted(tr['points'] + tr['unrecorded'], key=lambda e: e['step'])
    return tr, rows, el

def secs_to(rows, el, k, how):
    # corrector seconds of the first k accepted steps. 'creep-attempts' = the way tools/creep-attempts.py counts the stretch before the creep: all attempts with a loop step below the loop step of the (k+1)-th accepted step
    # (the failed attempts that lead to step k + 1 are in); 'through' = the attempts up to and including the loop step of the k-th accepted step
    if how == 'creep-attempts':
        lim = el[k]['step'] if k < len(el) else rows[-1]['step'] + 1
        return sum(r.get('seconds', 0) for r in rows if r['step'] < lim)
    return sum(r.get('seconds', 0) for r in rows if r['step'] <= el[k - 1]['step'])

def path(pts):
    return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))

# ---------------------------------------------------------------- step 1: the check
data = {}
for label in ('t35m', 't44m'):
    tr, rows, el = load(label); data[label] = (tr, rows, el)
    ref = cc['families'][label]['before_creep']['corrector_seconds']; k = STRETCH[label]
    a, b = secs_to(rows, el, k, 'creep-attempts'), secs_to(rows, el, k, 'through')
    print(label, 'stored', ref, '| creep-attempts way', round(a, 3), '| through the k-th', round(b, 3), '| accepted steps', len(el), '| attempts', len(rows))
    if abs(a - ref) > 0.1:
        print('CHECK FAILED for', label, '(difference %.3f s): nothing written' % (a - ref)); sys.exit(1)
print('CHECK OK: the corrector seconds of the accepted steps 1..1220 and 1..623, counted as creep-attempts.py counts them, reproduce cost-comparison.json to 0.1 s')

# ---------------------------------------------------------------- node: the rule exactly as the file says
def node_first_fire(lams):
    js = ("import { handoverFires } from %s; import fs from 'fs'; const lams = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); let first = null;"
          " for (let K = 1; K <= lams.length - 1; K++) { if (handoverFires(lams.slice(0, K + 1), %r)) { first = K; break; } } console.log(JSON.stringify(first));") % (json.dumps(pathlib.Path(REL + 'tools/handover-rule.mjs').as_uri()), BELOW)
    with tempfile.TemporaryDirectory() as d:
        jf, lf = os.path.join(d, 'f.mjs'), os.path.join(d, 'l.json')
        with open(jf, 'w') as fh: fh.write(js)
        with open(lf, 'w') as fh: json.dump(lams, fh)
        return json.loads(subprocess.run(['node', jf, lf], capture_output=True, text=True, check=True).stdout)

def p100(lams, k): return abs(lams[k] - lams[k - 100]) / 100 if k >= 100 else None

res = dict(what='', commands=[], inputs={}, families={})
for label in ('t35m', 't44m'):
    tr, rows, el = data[label]; k_end = STRETCH[label]
    lams = [tr['start']['lam']] + [e['lam'] for e in el]            # lams[0] = lam of the start of the run, lams[k] = lam of the k-th accepted step
    h_node = node_first_fire(lams)
    h_py = next((k for k in range(100, len(lams)) if p100(lams, k) < BELOW), None)
    h_file = ho['checks']['traces'][label]['a_rule']['accepted_step']
    assert h_node == h_py, (h_node, h_py)
    Q = lp['traces'][label]['step_at']['0.99']['accepted_index']
    big = [r for r in cs['families'][label]['runs'] if r['every_step_converged']]; big = max(big, key=lambda r: abs(r['step_dlam']))
    step = abs(big['step_dlam']); rate50 = 1.0 / big['seconds_per_unit_lam']        # lam per 50 digit second
    cont = L(CONT[label]); crows = [s for s in cont['steps'] if s['converged']]
    assert len(crows) == big['steps_converged'] and abs(abs(float(cont['dlam'])) - step) < 1e-12, (label, len(crows), big['steps_converged'])
    cdl = abs(float(cont['dlam']))
    inc = [math.sqrt(sum(x * x for x in s['change_abs']) + cdl * cdl) for s in crows]          # arclength of each 50 digit step
    secs50 = [s['seconds'] for s in crows]
    # B: the first k >= 100 at which P100 per PeriCont second falls below the lam per 50 digit second
    B = None
    for k in range(100, len(el) + 1):
        s100 = secs_to(rows, el, k, 'creep-attempts') - secs_to(rows, el, k - 100, 'creep-attempts')
        if p100(lams, k) * 100 / s100 < rate50: B = k; break
    pts = [(e['u1'], e['u2'], e['t'], e['lam']) for e in el]
    lam1 = el[0]['lam']; lam_end = el[k_end - 1]['lam']
    stretch_lam = abs(lam_end - lam1)
    total_cost50 = sum(secs50) / (len(crows) * cdl)                                           # seconds per unit lam of the whole larger-step run
    fam = dict(accepted_steps=len(el), attempts=len(rows), stretch_end_step=k_end, stretch_lam=stretch_lam, pericont_seconds_to_stretch_end=secs_to(rows, el, k_end, 'creep-attempts'),
               fifty_digit_larger_step=dict(step_dlam=-step if cont['dlam'].startswith('-') else step, steps=len(crows), seconds=sum(secs50), seconds_per_unit_lam=big['seconds_per_unit_lam'], seconds_per_unit_arclength=big['seconds_per_unit_arclength'], lam_per_second=rate50),
               boundaries={})
    for name, k in (('H', h_node), ('Q', Q), ('B', B)):
        if k is None: fam['boundaries'][name] = None; continue
        cov = abs(el[k - 1]['lam'] - lam1)
        n = next(j for j in range(1, len(crows) + 1) if j * cdl >= cov - 1e-15) if cov <= len(crows) * cdl + 1e-15 else len(crows)
        ps = secs_to(rows, el, k, 'creep-attempts'); pp = path(pts[:k])
        s50, p50, c50 = sum(secs50[:n]), sum(inc[:n]), n * cdl
        rest = abs(lam_end - el[k - 1]['lam'])
        route = ps + rest * big['seconds_per_unit_lam']
        alone = stretch_lam * big['seconds_per_unit_lam']
        fam['boundaries'][name] = dict(
            accepted_step=k, loop_step=el[k - 1]['step'], lam=el[k - 1]['lam'], lam_covered=cov, fraction_of_the_stretch_lam=cov / stretch_lam,
            pericont=dict(corrector_seconds=ps, seconds_per_accepted_step=ps / k, path_length=pp, seconds_per_unit_lam=ps / cov, seconds_per_unit_arclength=ps / pp),
            fifty_digit=dict(steps=n, lam_covered=c50, seconds=s50, path_length=p50, seconds_per_unit_lam=s50 / c50, seconds_per_unit_arclength=s50 / p50, one_step_only=(n == 1)),
            factor_lam=(s50 / c50) / (ps / cov), factor_arclength=(s50 / p50) / (ps / pp),
            route=dict(pericont_to_k_then_fifty_digit_seconds=route, remaining_lam=rest, fifty_digit_alone_over_the_stretch_seconds=alone, route_over_alone=route / alone))
        if name == 'H':
            fam['boundaries']['H']['p100_at_the_step'] = p100(lams, k); fam['boundaries']['H']['handover_json_accepted_step'] = h_file; fam['boundaries']['H']['same_as_handover_json'] = (h_file == k)
            fam['boundaries']['H']['first_k_by_node_handoverFires'] = h_node; fam['boundaries']['H']['first_k_by_python'] = h_py
        if name == 'B':
            fam['boundaries']['B']['break_even_p100'] = rate50 * (ps / k)
            fam['boundaries']['B']['break_even_p100_over_default'] = rate50 * (ps / k) / BELOW
    fam['pericont_whole_stretch_cost_for_the_record'] = dict(seconds=fam['pericont_seconds_to_stretch_end'], seconds_per_unit_lam=cc['families'][label]['before_creep']['seconds_per_unit_lam'], factor_lam_whole_stretch=big['factor_lam_over_pericont'])
    res['families'][label] = fam
    res['inputs'][label] = dict(trace='data/deep/traces/%s.json' % label, diag='raw deposit traces/%s.diag.jsonl (%d attempts)' % (label, len(rows)), larger_step_run='the *_continue.json of tools/reclose-continue.py of the larger-step run of extra/cost-same-stretch.json (step %g in lam); it holds the change of (u1, u2, t) of every step, from which the arclength of the first n steps is taken' % step)
res['what'] = ('the cost per unit of lam and of arclength of PeriCont over the accepted steps 1..k of t35 - and t44 - at three boundaries k (H: the first accepted step at which the hand-over rule of tools/handover-rule.mjs fires with 1e-7; Q: the 99 % point of lambda-progress.json; B: the first k >= 100 at which the lam per PeriCont second of the last 100 accepted steps falls below the lam per second of the 50 digit continuation at its larger step), '
               'against the 50 digit natural continuation (the larger-step run of cost-same-stretch.json) over the same lam; the route PeriCont to k and then the 50 digit continuation; and the break-even P100 of the hand-over rule. PeriCont seconds are the corrector seconds of the per-attempt records, counted as tools/creep-attempts.py counts them '
               '(all attempts with a loop step below the loop step of the (k+1)-th accepted step); the check against cost-comparison.json (2193.079 s and 1774.675 s for the accepted steps 1..1220 and 1..623) passes to 0.1 s. The 50 digit side is the first n steps of the run whose lam reaches lam_k (a step overshoots; the denominator is the lam really covered).')
res['commands'] = ['python tools/cost-before-floor.py REL RAW CONT_T35M CONT_T44M OUT.json   (it needs RAW/traces/<label>.diag.jsonl, the per-attempt records of the stored runs, and the *_continue.json of the larger-step run of each family, which are in the raw deposit; REL: this repository)']
res['other_jobs_during_the_stored_runs'] = 'not recorded (the per-attempt records hold seconds per attempt and no load; no log of the stored runs names other jobs)'
res['decision_inputs'] = {l: dict(H_accepted_step=f['boundaries']['H']['accepted_step'], H_factor_lam=f['boundaries']['H']['factor_lam']) for l, f in res['families'].items()}
json.dump(res, open(OUT, 'x', encoding='utf8'), indent=1)
print('written', OUT)
for label, f in res['families'].items():
    print('==', label, 'stretch lam %.6g' % f['stretch_lam'], '50 digit larger step: %.4g s per unit lam' % f['fifty_digit_larger_step']['seconds_per_unit_lam'])
    for name, b in f['boundaries'].items():
        if not b: print('  ', name, None); continue
        print('   %s k=%d lam covered %.4g (%.1f%%) PeriCont %.0f s -> %.3g s/lam, %.3g s/arc | 50 digit %d steps %.0f s -> %.3g, %.3g | factor lam %.2f arc %.2f | route %.0f s vs alone %.0f s' % (name, b['accepted_step'], b['lam_covered'], 100 * b['fraction_of_the_stretch_lam'], b['pericont']['corrector_seconds'], b['pericont']['seconds_per_unit_lam'], b['pericont']['seconds_per_unit_arclength'],
              b['fifty_digit']['steps'], b['fifty_digit']['seconds'], b['fifty_digit']['seconds_per_unit_lam'], b['fifty_digit']['seconds_per_unit_arclength'], b['factor_lam'], b['factor_arclength'], b['route']['pericont_to_k_then_fifty_digit_seconds'], b['route']['fifty_digit_alone_over_the_stretch_seconds']))
        if 'break_even_p100' in b: print('      break-even P100 %.3g (%.3g x the default 1e-7)' % (b['break_even_p100'], b['break_even_p100_over_default']))
