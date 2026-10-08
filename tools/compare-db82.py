# the exactly periodic orbits (theta/2 a multiple of pi) among the rows of the Davoust and Broucke tables (converted with tools/convert-db82.mjs)
# against my 85 orbits and the 17 of the arclength list, allowing n fold repeats (n = 1..9). python tools/compare-db82.py
import json, math
conv = []
for f in ('db82-A1-converted', 'db82-table3-converted', 'db82-table4-converted', 'db82-table5-converted', 'db82-table6-converted', 'db82-table7-converted'):
    conv += json.load(open('data/%s.json' % f))
per = [c for c in conv if c['ts'] and c['thalfFromTheta'] is not None and (c['thalfFromTheta'] < 1e-6 or abs(c['thalfFromTheta'] - math.pi) < 1e-6)]
rows = json.load(open('data/orbit-table.json')); arc = json.load(open('data/perp-arc-orbits.json'))
mine = [(r['Tstar'], r['Lstar'], '85 (%s)' % r['group']) for r in rows] + [(r['primitiveTstar'], r['Lstar'], '85 primitive') for r in rows] + [(a['ts'], a['ls'], '17 arclength') for a in arc]
out = []
print(len(conv), 'rows converted,', len(per), 'exactly periodic')
for c in sorted(per, key=lambda c: c['N']):
    best = None
    for t, l, tag in mine:
        for n in range(1, 10):
            for a, b in ((c['ts'], t * n), (c['ts'] * n, t)):
                d = max(abs(a - b) / b, abs(c['ls'] - l) / l)
                if best is None or d < best[0]: best = (d, tag, t, l, n)
    same = best[0] < 1e-5
    out.append({'N': c['N'], 'Tstar': c['ts'], 'Lstar': c['ls'], 'closest': {'dist': best[0], 'list': best[1], 'Tstar': best[2], 'Lstar': best[3], 'n': best[4]}, 'in_my_lists': same})
    print('D&B row %3d  T*=%8.4f L*=%.5f  %s  (closest %.1e: %s T*=%.4f L*=%.4f n=%d)' % (c['N'], c['ts'], c['ls'], 'IN MY LISTS' if same else 'not in my lists', *best))
json.dump(out, open('data/db82-exactly-periodic.json', 'w'), indent=1)
