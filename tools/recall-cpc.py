# recall test: how many of the published satellites (CPC 2020) with exponent k lie on a branch arm of the same exponent that my search followed?
# "tested": the (T*, L*) of the satellite is inside the box spanned by some arm with the same total exponent (also arms that turn out to be repeat curves of the parent);
# "found": an arm that is not a repeat curve passes within 5e-3 of it. The rule is the one of the first version (5 tested); it is not changed after seeing the result.
# python tools/recall-cpc.py
import json, glob, math, collections
cpc = [(c['N'], c['k'], c['ts_theirs'], c['ls_theirs']) for c in json.load(open('data/cpc-converted.json'))]
seen = []
for f in ('data/stability-perp-3.json', 'data/stability-arc.json'):
    for o in json.load(open(f)):
        if o['stable'] and round(o['ts'], 3) not in [round(x, 3) for x in seen]: seen.append(o['ts'])
EXPONENT = {4.96: 1, 9.658: 3, 17.847: 5, 19.769: 6, 29.31: 8, 33.745: 9, 47.065: 16}
def kp_of(ts):
    for k, v in EXPONENT.items():
        if abs(k - ts) < 0.01: return v

def segdist(p, a, b):
    ax, ay = a[0] / p[0], a[1] / p[1]; bx, by = b[0] / p[0], b[1] / p[1]
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((1 - ax) * dx + (1 - ay) * dy) / L))
    return math.hypot(ax + t * dx - 1, ay + t * dy - 1)

import os
REP = json.load(open('data/arm-repeats.json')) if os.path.exists('data/arm-repeats.json') else {}
arms = []   # (ktotal, parent, curve)
for f in sorted(glob.glob('data/satellite-results*.jsonl')):
    if f.endswith('results5.jsonl') and False: continue
    for line in open(f):
        r = json.loads(line); j = r['job']
        kp = kp_of(seen[j['orbit']]) if j['orbit'] < len(seen) else None
        if not kp: continue
        for b in r['branches']:
            if not b['ok']: continue
            rep = REP.get('%d|%d|%.4f|%d' % (j['orbit'], j['k'], b['lamBP'], b['sgn']))
            isrep = bool(rep and rep['onRepeatCurve'])         # only the repeat of the parent, not a branch: it counts for the box, not for finding
            nrep = rep['nRepeat'] if rep and not isrep else 1  # minimal period of the orbits of the arm (a repeat curve keeps its own k, as in the first version)
            c = []
            for q in b['curve']:
                if q[3] >= 1e-7: break
                c.append((q[1] / nrep, q[2]))
            if len(c) >= 3: arms.append(((kp * j['k']) // nrep, seen[j['orbit']], c, isrep))
if not arms: raise SystemExit('no branch arm loaded: nothing was compared')
res = collections.defaultdict(lambda: [0, 0, 0])
detail = []
for N, k, ts, ls in cpc:
    res[k][0] += 1
    tested = hit = False
    for kt, par, c, isrep in arms:
        if kt != k: continue
        if min(p[0] for p in c) * 0.98 <= ts <= max(p[0] for p in c) * 1.02 and min(p[1] for p in c) * 0.98 <= ls <= max(p[1] for p in c) * 1.02: tested = True
        if not isrep and min(segdist((ts, ls), c[i], c[i + 1]) for i in range(len(c) - 1)) < 5e-3: hit = True
    if tested: res[k][1] += 1
    if hit: res[k][2] += 1; detail.append((N, k))
print('k  satellites  tested (inside the box of an arm)  found')
tot = [0, 0, 0]
for k in sorted(res):
    print('%2d %6d %10d %12d' % (k, *res[k])); tot = [a + b for a, b in zip(tot, res[k])]
print('all', tot, ' hits:', detail)
if tot[1] == 0: raise SystemExit('no satellite was inside any arm: check the files before reading this as a result')
print('with k <= 20:', [sum(res[k][i] for k in res if k <= 20) for i in range(3)])
