# the orbits of the perpendicular search that are not in the atlas, against the 99 satellites of Jankovic et al. (CPC 2020):
# smallest relative distance of (T*, L*) to a satellite, allowing n fold repeats of either one (n = 1..8). python tools/compare-unmatched.py
import json, math
rows = json.load(open('data/orbit-table.json'))
cpc = [(c['N'], c['k'], c['ts_theirs'], c['ls_theirs']) for c in json.load(open('data/cpc-converted.json'))]
res = []
for r in rows:
    if r['group'] != 'unmatched': continue
    ts = r['primitiveTstar']; ls = r['Lstar']
    best = None
    for N, k, t, l in cpc:
        for n in range(1, 9):
            for a, b in ((ts, t * n), (ts * n, t)):
                d = max(abs(a - b) / b, abs(ls - l) / l)
                if best is None or d < best[0]: best = (d, N, k, n)
    res.append((best[0], r['Tstar'], r['Lstar'], best))
if not res: raise SystemExit('no unmatched orbit in the table: nothing was compared')
res.sort()
print(len(res), 'unmatched orbits; closest to any CPC satellite (with repeats): relative distance %.2e (N = %d, k = %d, n = %d)' % res[0][3])
print('number closer than 1e-3:', sum(1 for x in res if x[0] < 1e-3), ' closer than 1e-2:', sum(1 for x in res if x[0] < 1e-2))
