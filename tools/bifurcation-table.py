# one table of all the branch points found by tools/satellite-hunt.mjs (data/satellite-results*.jsonl):
# progenitor orbit, k of the repeat, lam at the branch point, T* and L* of the repeat there, closest CPC satellite of the same
# k to either arm. writes data/bifurcation-points.json and prints it.   python tools/bifurcation-table.py   (needs data/arm-repeats.json, see tools/arm-repeats-summary.py)
import json, glob, math
stable_ts = {}
for f in ('data/stability-perp-3.json', 'data/stability-arc.json'):
    for o in json.load(open(f)):
        if o['stable']: stable_ts.setdefault(round(o['ts'], 3), o['ts'])
order = sorted(stable_ts.values())
# orbit indexes in the job files follow the order in tools/nu-crossings.mjs: perp-3 stable ones first, then arc ones
seen = []
for f in ('data/stability-perp-3.json', 'data/stability-arc.json'):
    for o in json.load(open(f)):
        if o['stable'] and round(o['ts'], 3) not in [round(x, 3) for x in seen]: seen.append(o['ts'])
cpc = [(c['N'], c['k'], c['ts_theirs'], c['ls_theirs']) for c in json.load(open('data/cpc-converted.json'))]
# topological exponent of each progenitor (its syzygy word is (01)^kp), so a branch from the k fold repeat has exponent kp * k
EXPONENT = {4.96: 1, 9.658: 3, 17.847: 5, 19.769: 6, 29.31: 8, 33.745: 9, 47.065: 16}

def segdist(p, a, b):
    ax, ay = a[0] / p[0], a[1] / p[1]; bx, by = b[0] / p[0], b[1] / p[1]
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((1 - ax) * dx + (1 - ay) * dy) / L))
    return math.hypot(ax + t * dx - 1, ay + t * dy - 1)

import os
# arms whose states were stored have been checked for repeats (tools/arm-repeat-check.mjs, tools/arm-repeats-summary.py): an arm that is only the k fold repeat
# of its parent is not a branch and is dropped; any other arm is compared with the satellites after reducing it to its minimal period
REP = json.load(open('data/arm-repeats.json')) if os.path.exists('data/arm-repeats.json') else {}
points = {}
for f in sorted(glob.glob('data/satellite-results.jsonl') + glob.glob('data/satellite-results[2-9].jsonl')):
    f = f.replace('\\', '/')   # glob gives backslashes on Windows
    for line in open(f):
        r = json.loads(line); j = r['job']
        for b in r['branches']:
            if not b['ok'] or not b.get('repeat'): continue
            key = (j['orbit'], j['k'], round(b['lamBP'], 3))
            kp = EXPONENT[round(seen[j['orbit']], 3) if round(seen[j['orbit']], 3) in EXPONENT else round(seen[j['orbit']], 2)] if (round(seen[j['orbit']], 3) in EXPONENT or round(seen[j['orbit']], 2) in EXPONENT) else None
            p = points.setdefault(key, dict(orbit=j['orbit'], progenitor_ts=seen[j['orbit']], k=j['k'], kp=kp, ktotal=(kp * j['k'] if kp else None), other_k_hit=None, same_k_closest=None, lamBP=b['lamBP'], repeat_ts=b['repeat']['ts'], repeat_ls=b['repeat']['ls'], file=f, arms=[], hit=None))
            rk = '%d|%d|%.4f|%d' % (j['orbit'], j['k'], b['lamBP'], b['sgn'])
            rep = REP.get(rk)
            if rep and rep['onRepeatCurve']:
                p['repeat_curve_arms'] = p.get('repeat_curve_arms', 0) + 1     # not a branch
                continue
            nrep = rep['nRepeat'] if rep else 1
            p['checked_arms'] = p.get('checked_arms', 0) + (1 if rep else 0)
            c = []
            for q in b['curve']:
                if q[3] >= 1e-7: break          # cut the arm at the first bad point, the same way as compare-satellites.py
                c.append((q[1] / nrep, q[2]))   # minimal period of the orbit
            if len(c) < 3: continue
            p['arms'].append(len(c))
            ktot = (kp * j['k']) // nrep if kp else None
            for N, k, ts, ls in cpc:
                d = min(segdist((ts, ls), c[i], c[i + 1]) for i in range(len(c) - 1))
                if ktot and k == ktot and (p['same_k_closest'] is None or d < p['same_k_closest'][1]): p['same_k_closest'] = [N, d]
                if d < 5e-3:
                    if ktot and k == ktot:
                        if p['hit'] is None or d < p['hit'][1]: p['hit'] = [N, d, k]
                    elif p['other_k_hit'] is None or d < p['other_k_hit'][1]: p['other_k_hit'] = [N, d, k]
if not points: raise SystemExit('no branch point found in data/satellite-results*.jsonl: nothing was compared')
# rows that carry a 'retracted' block in the existing table (the N = 1 entry of 2026-10-09) keep it, together with the values that were retracted, so that running this script
# again does not erase the retraction. the old value stays visible next to it.
if os.path.exists('data/bifurcation-points.json'):
    for old in json.load(open('data/bifurcation-points.json')):
        if 'retracted' not in old: continue
        key = (old['orbit'], old['k'], round(old['lamBP'], 3))
        if key not in points: raise SystemExit('the row with a retraction %s is not in the new table: not overwriting' % (key,))
        for f in ('hit', 'same_k_closest', 'retracted'): points[key][f] = old[f]
rows = sorted(points.values(), key=lambda p: (p['progenitor_ts'], p['k'], p['lamBP']))
json.dump(rows, open('data/bifurcation-points.json', 'w'), indent=1)
print('%d branch points' % len(rows))
print('%d rows whose arms are all repeat curves of the parent (not branches)' % sum(1 for p in rows if p.get('repeat_curve_arms') and not p['arms']))
for p in rows:
    note = ('= CPC N=%d (k=%d, dist %.1e)' % (p['hit'][0], p['hit'][2], p['hit'][1])) if p['hit'] else ('near CPC N=%d but its k is %d, not %s' % (p['other_k_hit'][0], p['other_k_hit'][2], p['ktotal']) if p['other_k_hit'] else '')
    print('prog T*=%7.3f  k=%2d  lam_bp=%.4f  repeat T*=%8.3f L*=%.4f  arms %-9s %s' % (p['progenitor_ts'], p['k'], p['lamBP'], p['repeat_ts'], p['repeat_ls'], p['arms'], note))
