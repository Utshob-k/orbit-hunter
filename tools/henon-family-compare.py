# is one of my orbits n relative periods of a member of the family m of Henon 1976 (planar, equal masses)?
# a member is a relative periodic orbit: after one relative period the bodies are in their own places, turned by a rotation angle. n of them make an orbit that returns
# rotated after T/n (tools/return-test.mjs, data/return-test.json), so only orbits with such a return can be members' repeats.
# reads data/henon-family-curve.json (derived points of the traced family), data/henon1976-derived.json (derived numbers of the tabulated orbits), data/return-test.json
# python tools/henon-family-compare.py
import json, math, sys
curve = json.load(open('data/henon-family-curve.json'))['segments']
rows = [r for r in json.load(open('data/henon1976-derived.json'))['rows'] if r['orbit'] >= 2]
ret = json.load(open('data/return-test.json'))
if not curve or not rows or not ret: sys.exit('empty input: nothing was compared')
fold = lambda x: abs(x - round(x))        # distance of a number of turns from a whole number (the sign of the angle does not matter for equal masses)
P = [p for s in curve for p in s['points']]
print('traced family: %d segments, %d points, L* %.3f to %.3f, T* of one relative period %.3f to %.3f' % (len(curve), len(P), min(p[0] for p in P), max(p[0] for p in P), min(p[1] for p in P), max(p[1] for p in P)))
print('closure of the relative period with the bodies in their own places (no relabelling), over all points: largest %.1e, median %.1e' % (max(p[3] for p in P), sorted(p[3] for p in P)[len(P) // 2]))

def nearest(T, L, tu):
    # distance of (T*, L*, turns) from the polyline of every segment: relative in T* and L*, absolute in turns (folded)
    best = None
    for s in curve:
        q = s['points']
        for i in range(len(q) - 1):
            a = (q[i][1] / T - 1, q[i][0] / L - 1 if L > 0 else 0, fold(q[i][2] / (2 * math.pi)) - tu)
            b = (q[i + 1][1] / T - 1, q[i + 1][0] / L - 1 if L > 0 else 0, fold(q[i + 1][2] / (2 * math.pi)) - tu)
            d = [b[k] - a[k] for k in range(3)]; l2 = sum(x * x for x in d)
            f = 0 if l2 == 0 else max(0, min(1, -sum(a[k] * d[k] for k in range(3)) / l2))
            dist = math.sqrt(sum((a[k] + f * d[k]) ** 2 for k in range(3)))
            if best is None or dist < best: best = dist
    return best

# 1. the traced curve against the tabulated orbits (T* and the rotation angle at the printed L*)
far = []
worst = 0
for r in rows:
    if r['Lstar'] <= 0: continue
    d = nearest(r['Tstar'], r['Lstar'], fold(r['Phi_printed'] / (2 * math.pi)))
    worst = max(worst, d)
    if d > 0.01: far.append((r['orbit'], round(d, 3)))
print('tabulated orbits 2 to 46 against the traced curve (distance in T*, L*, turns): %d of %d within 0.01; farther (orbit, distance): %s' % (len(rows) - len(far), len(rows), far))
print('  (the curve is sampled every 4th accepted step, which is coarse near the retrograde end, orbit 44; the printed rotation angle of orbit 42 looks like a misprint, see the derived file)')
bhh = [r for r in rows if r['Phi_printed'] == 0]
print('tabulated orbits with rotation angle 0:', [(r['orbit'], r['Tstar'], r['Lstar']) for r in bhh])

# 2. my orbits that return in their own places after T/n (n >= 2): distance of (T*/n, L*, turns) from the family
print('\norbits that return rotated after T/n with the bodies in their own places (the only candidates), distance from the family:')
for o in ret:
    if o['group'] == 'unmatched' and o['ownPlaces']:
        w = o['ownPlaces']; d = nearest(w['Tstar_relative'], o['Lstar'], fold(w['turns']))
        print('  %s n=%d  T*/n %.4f  L* %.4f  turns %.4f   distance %.3f' % (o['name'], w['n'], w['Tstar_relative'], o['Lstar'], fold(w['turns']), d))
# 3. the unmatched orbits that return only with the bodies relabelled (not in their own places): same comparison with the relabelled return
print('\norbits that return only with relabelling of the bodies (not the family\'s own-places return), same comparison:')
for o in ret:
    if o['group'] == 'unmatched' and not o['ownPlaces'] and o['anySymmetry']:
        w = o['anySymmetry']; d = nearest(w['Tstar_relative'], o['Lstar'], fold(w['turns']))
        print('  %s n=%d perm %s  T*/n %.4f  L* %.4f  turns %.4f   distance %.3f' % (o['name'], w['n'], w['perm'], w['Tstar_relative'], o['Lstar'], fold(w['turns']), d))
