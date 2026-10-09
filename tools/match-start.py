# for a published satellite (data/cpc-converted.json, in my start u1, u2, lam, t) and an arm of a results file: the point of the arm (interpolated between samples) closest to the
# published (T*, L*), and there the differences of lam, u1, u2, t to the published start. an orbit with the velocities reversed is the same orbit, so |u1|, |u2| are compared.
# python tools/match-start.py results.jsonl N orbit k lamBP
import json, sys, math
f, N, orbit, k, bp = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), float(sys.argv[5])
cp = [c for c in json.load(open('data/cpc-converted.json')) if c['N'] == N][0]
m = cp['mine']; T0, L0 = cp['ts_theirs'], cp['ls_theirs']
n = 0
for line in open(f):
    r = json.loads(line)
    if r['job']['orbit'] != orbit or r['job']['k'] != k: continue
    for b in r['branches']:
        if not b['ok'] or abs(b['lamBP'] - bp) > 5e-4: continue
        c = [p for p in b['curve'] if p[3] < 1e-7 and len(p) >= 8]
        best = None
        for i in range(1, len(c)):
            a, bb = c[i - 1], c[i]
            ax, ay, bx, by = a[1] / T0 - 1, a[2] / L0 - 1, bb[1] / T0 - 1, bb[2] / L0 - 1
            dx, dy = bx - ax, by - ay; ll = dx * dx + dy * dy
            t = 0 if ll == 0 else max(0, min(1, -(ax * dx + ay * dy) / ll))
            d = math.hypot(ax + t * dx, ay + t * dy)
            if best is None or d < best[0]: best = (d, i, t)
        if best is None: continue
        d, i, t = best
        a, bb = c[i - 1], c[i]
        v = [None if a[j] is None else a[j] + t * (bb[j] - a[j]) for j in range(8)]
        n += 1
        print('arm sgn %+d: closest point of the arm to the published (T*, L*): distance %.1e at lam %.5f (published start lam %.5f)' % (b['sgn'], d, v[0], m['lam']))
        print('   |u1| %.6f vs %.6f, |u2| %.6f vs %.6f, t %.6f vs %.6f, T* %.6f vs %.6f, L* %.6f vs %.6f' % (abs(v[5]), abs(m['u1']), abs(v[6]), abs(m['u2']), v[7], m['t'], v[1], T0, v[2], L0))
if n == 0: sys.exit('no arm found: nothing was compared')
