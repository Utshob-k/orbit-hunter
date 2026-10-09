# how far is each of my orbits from the rows of Table 1 of Li, Tao, Li and Liao 2025, in the scale free numbers (T*, L*)?
# distance of an orbit (T, L) from a row (Tr, Lr): max( |T - Tr| / Tr , |L - Lr| / max(Lr, 0.05) )  (the floor 0.05 keeps the L = 0 rows from dividing by zero)
# T is the primitive T* of the orbit (the shortest period), no repeats; my 85 orbits (data/orbit-table.json) and the 17 of the arclength list (data/perp-arc-orbits.json)
# python tools/liao-distance.py
import json, sys
rows = json.load(open('data/liao2025-scaled.json'))
tab = json.load(open('data/orbit-table.json')); arc = json.load(open('data/perp-arc-orbits.json'))
if len(rows) != 18 or len(tab) != 85: sys.exit('expected 18 rows and 85 orbits')
mine = [('t%02d' % i, o['primitiveTstar'], o['Lstar']) for i, o in enumerate(tab)] + [('a%02d' % i, a['ts'], abs(a['ls'])) for i, a in enumerate(arc)]
def dist(m, r): return max(abs(m[1] - r['Tstar']) / r['Tstar'], abs(m[2] - r['Lstar']) / max(r['Lstar'], 0.05))
best = sorted((dist(m, r), m[0], m[1], m[2], r['family'], r['L_paper'], r['Tstar'], r['Lstar']) for m in mine for r in rows)[:5]
print(len(mine), 'orbits x', len(rows), 'rows; the five smallest distances:')
for d, k, t, l, fam, lp, tr, lr in best: print('  %.3f  %s (T*=%.3f L*=%.4f)  vs %s L=%.3f (T*=%.3f L*=%.4f)' % (d, k, t, l, fam, lp, tr, lr))
# the same without the floor (L* relative to the row's L*, rows with L > 0 only), with repeats of either side allowed: n copies of my orbit against m copies of the row, n and m up to 8.
# L* does not change with the number of repeats, T* is multiplied; the distance is max( |n T - m Tr| / (m Tr) , |L - Lr| / Lr )
def dist2(m, r, n, k): return max(abs(n * m[1] - k * r['Tstar']) / (k * r['Tstar']), abs(m[2] - r['Lstar']) / r['Lstar'])
b2 = sorted((dist2(m, r, n, k), m[0], m[1], m[2], n, r['family'], r['L_paper'], k) for m in mine for r in rows if r['Lstar'] > 0 for n in range(1, 9) for k in range(1, 9))
print('without the floor and with repeats of either side (n, m up to 8), the three smallest:')
for d, k, t, l, n, fam, lp, m in b2[:3]: print('  %.3f  %s (T*=%.3f L*=%.4f) x%d  vs %s L=%.3f x%d' % (d, k, t, l, n, fam, lp, m))
