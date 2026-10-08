# one table of all the branch points found by tools/satellite-hunt.mjs (data/satellite-results*.jsonl):
# progenitor orbit, k of the repeat, lam at the branch point, T* and L* of the repeat there, closest CPC satellite of the same
# k to either arm. writes data/bifurcation-points.json and prints it.   python tools/bifurcation-table.py
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

points = {}
for f in sorted(glob.glob('data/satellite-results.jsonl') + glob.glob('data/satellite-results[2-4].jsonl')):
    for line in open(f):
        r = json.loads(line); j = r['job']
        for b in r['branches']:
            if not b['ok'] or not b.get('repeat'): continue
            key = (j['orbit'], j['k'], round(b['lamBP'], 3))
            kp = EXPONENT[round(seen[j['orbit']], 3) if round(seen[j['orbit']], 3) in EXPONENT else round(seen[j['orbit']], 2)] if (round(seen[j['orbit']], 3) in EXPONENT or round(seen[j['orbit']], 2) in EXPONENT) else None
            p = points.setdefault(key, dict(orbit=j['orbit'], progenitor_ts=seen[j['orbit']], k=j['k'], kp=kp, ktotal=(kp * j['k'] if kp else None), other_k_hit=None, same_k_closest=None, lamBP=b['lamBP'], repeat_ts=b['repeat']['ts'], repeat_ls=b['repeat']['ls'], file=f, arms=[], hit=None))
            c = []
            for q in b['curve']:
                if q[3] >= 1e-7: break          # cut the arm at the first bad point, the same way as compare-satellites.py
                c.append((q[1], q[2]))
            if len(c) < 3: continue
            p['arms'].append(len(c))
            for N, k, ts, ls in cpc:
                d = min(segdist((ts, ls), c[i], c[i + 1]) for i in range(len(c) - 1))
                if kp and k == kp * j['k'] and (p['same_k_closest'] is None or d < p['same_k_closest'][1]): p['same_k_closest'] = [N, d]
                if d < 5e-3:
                    if kp and k == kp * j['k']:
                        if p['hit'] is None or d < p['hit'][1]: p['hit'] = [N, d, k]
                    elif p['other_k_hit'] is None or d < p['other_k_hit'][1]: p['other_k_hit'] = [N, d, k]
rows = sorted(points.values(), key=lambda p: (p['progenitor_ts'], p['k'], p['lamBP']))
json.dump(rows, open('data/bifurcation-points.json', 'w'), indent=1)
print('%d branch points' % len(rows))
for p in rows:
    note = ('= CPC N=%d (k=%d, dist %.1e)' % (p['hit'][0], p['hit'][2], p['hit'][1])) if p['hit'] else ('near CPC N=%d but its k is %d, not %s' % (p['other_k_hit'][0], p['other_k_hit'][2], p['ktotal']) if p['other_k_hit'] else '')
    print('prog T*=%7.3f  k=%2d  lam_bp=%.4f  repeat T*=%8.3f L*=%.4f  arms %-9s %s' % (p['progenitor_ts'], p['k'], p['lamBP'], p['repeat_ts'], p['repeat_ls'], p['arms'], note))
