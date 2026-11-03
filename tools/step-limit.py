# SPDX-License-Identifier: MIT
# What limits the step in lam before the hand-over: the per-attempt records of the replays of t35 - and t44 - to the hand-over step H (262 and 286 accepted steps), cut into four blocks of accepted steps (1-50, 51-B, B+1-Q, Q+1-H with
# B and Q from data/deep/extra/cost-before-floor.json), per block the median arclength step h, the median |tauLam| (the lam component of the unit tangent at the start of the step), the median |dlam| of an accepted step, the failed
# attempts (count, range of the best residual of the corrector iterations), the accepted steps that took at most 3 iterations, and the ratios first block to last block. It also records what src/shooting.js (huntArclength) and
# tools/family-follow-ias.mjs say about the step control: the norm of the unit tangent, hMax, the growth rule and the theta limit; the strings are looked up in the sources and the script stops if one is missing.
# Inputs: REL (the repository) and the outputs of tools/reproduce-trace.mjs for the two replays, with their .diag.jsonl; those are in the raw deposit, not in the package.
#   python tools/step-limit.py REL REPLAY_T35M REPLAY_T44M OUT.json       OUT.json must be new
import sys, os, json, statistics
if len(sys.argv) < 5: sys.stderr.write('usage: python tools/step-limit.py REL REPLAY_T35M REPLAY_T44M OUT.json\n'); sys.exit(2)
BS = chr(92)
REL = sys.argv[1].replace(BS, '/').rstrip('/') + '/'
REPLAY = {'t35m': sys.argv[2], 't44m': sys.argv[3]}
OUT = sys.argv[4]
if os.path.exists(OUT): sys.exit('exists, not overwriting: ' + OUT)
L = lambda p: json.load(open(p, encoding='utf8'))
D = REL + 'data/deep/'
cbf = L(D + 'extra/cost-before-floor.json')

# ---- the step control as the sources have it
sh = open(REL + 'src/shooting.js', encoding='utf8').read()
ff = open(REL + 'tools/family-follow-ias.mjs', encoding='utf8').read()
facts = {}
for key, src, text in (('growth', sh, 'h = Math.min(hMax, c.iters <= 3 ? h * 1.4 : h);'),
                       ('theta_limit', sh, 'dth > Math.max(0.03, 0.3 * Math.abs(th))'),
                       ('tangent_turn_limit', sh, 'wdot(tauNew, tau) > Math.cos(0.35)'),
                       ('unit_tangent', sh, 'const wunit = (a) =>'),
                       ('arc_weight_default', sh, 'settings.arcWeight ?? 1'),
                       ('driver_hMax', ff, 'hMax: 0.2')):
    if text not in src: sys.exit('not found in the source: ' + text)
    facts[key] = text
facts['reading'] = ('h is the pseudo-arclength step; the unit tangent has norm 1 in the norm of (z, lam) with weight 1 on every component when arcWeight is unset (all 3 + 12 x (pieces - 1) node and start components and lam, 280 with 24 pieces), '
                    'so the step in lam of an accepted step is about h x tauLam; the driver passes hMax = 0.2; after a failed attempt h is halved; h grows by 1.4 only after an accepted step with at most 3 corrector iterations; '
                    'a step is refused when the unit tangent turns by more than 0.35 rad or theta changes by more than max(0.03, 0.3 |theta|)')

def med(v): return statistics.median(v) if v else None
def ratio(a, b): return a / b if a is not None and b else None

res = dict(what='', commands=[], step_control=facts, families={})
for label in ('t35m', 't44m'):
    rows = [json.loads(l) for l in open(REPLAY[label] + '.diag.jsonl', encoding='utf8') if l.strip()]
    tr = L(D + 'traces/%s.json' % label)
    lam_prev = tr['start']['lam']
    acc, failed_before = [], []      # accepted attempt, and the failed attempts since the previous accepted one
    pend = []
    for r in rows:
        if r['outcome'] == 'accepted':
            acc.append(dict(step=r['step'], h=r['h'], tau=abs(r['tauLam']), dlam=abs(r['lamNew'] - lam_prev), iters=r['iters'], failed=pend))
            lam_prev = r['lamNew']; pend = []
        else:
            pend.append(r)
    # the replay stops at a recorded point before the driver notes the last step as accepted: the last row (outcome 'tangent ok', converged) is the last accepted step, its lam is the stored one
    if pend and pend[-1]['outcome'] == 'tangent ok' and pend[-1].get('ok'):
        el = sorted(tr['points'] + tr['unrecorded'], key=lambda e: e['step'])
        r = pend[-1]; acc.append(dict(step=r['step'], h=r['h'], tau=abs(r['tauLam']), dlam=abs(el[len(acc)]['lam'] - lam_prev), iters=r['iters'], failed=pend[:-1])); pend = []
    H = len(acc)
    bd = cbf['families'][label]['boundaries']
    B, Q = bd['B']['accepted_step'], bd['Q']['accepted_step']
    blocks = {}
    for name, a, b in (('1-50', 1, 50), ('51-B', 51, B), ('B+1-Q', B + 1, Q), ('Q+1-H', Q + 1, H)):
        sel = acc[a - 1:b]
        fl = [f for s in sel for f in s['failed']]
        best = [min(f['resid']) for f in fl if f.get('resid')]
        blocks[name] = dict(first=a, last=b, accepted_steps=len(sel), median_h=med([s['h'] for s in sel]), median_abs_tauLam=med([s['tau'] for s in sel]), median_abs_dlam=med([s['dlam'] for s in sel]),
                            failed_attempts=len(fl), failed_best_residual_min=min(best) if best else None, failed_best_residual_max=max(best) if best else None,
                            failed_reasons=sorted(set(str(f.get('why')) for f in fl)), accepted_with_at_most_3_iterations=sum(1 for s in sel if s['iters'] <= 3))
    f, l = blocks['1-50'], blocks['Q+1-H']
    res['families'][label] = dict(accepted_steps=H, attempts=len(rows), B=B, Q=Q, blocks=blocks,
                                  first_over_last=dict(abs_dlam=ratio(f['median_abs_dlam'], l['median_abs_dlam']), abs_tauLam=ratio(f['median_abs_tauLam'], l['median_abs_tauLam']), h=ratio(f['median_h'], l['median_h'])),
                                  failed_attempts_in_total=sum(len(s['failed']) for s in acc))
res['what'] = ('the step in lam of the accepted steps of the replays of t35 - and t44 - to the hand-over step in four blocks of accepted steps: median arclength step h, median |tauLam|, median |dlam|, failed attempts and their best residual, '
               'accepted steps with at most 3 corrector iterations, and the ratios first block to last block; the step control of src/shooting.js (huntArclength) and of the driver as the sources have it')
res['commands'] = ['python tools/step-limit.py REL REPLAY_T35M REPLAY_T44M OUT.json   (the replays and their .diag.jsonl are in the raw deposit: node tools/reproduce-trace.mjs LABEL OUT.json --stop-after=K)']
res['inputs'] = {l: os.path.basename(REPLAY[l]) + ' and .diag.jsonl' for l in REPLAY}
json.dump(res, open(OUT, 'x', encoding='utf8'), indent=1)
print('written', OUT)
for label, fam in res['families'].items():
    print(label, 'H', fam['accepted_steps'], 'B', fam['B'], 'Q', fam['Q'], 'first over last', fam['first_over_last'])
    for n, b in fam['blocks'].items():
        print('  %-6s n %3d h %.4g tau %.3g dlam %.3g failed %d (%s .. %s) <=3 iters %d' % (n, b['accepted_steps'], b['median_h'], b['median_abs_tauLam'], b['median_abs_dlam'], b['failed_attempts'], b['failed_best_residual_min'], b['failed_best_residual_max'], b['accepted_with_at_most_3_iterations']))
