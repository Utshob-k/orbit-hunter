# members of the IA-3 family of Li et al. 2025 with a rotation angle theta = -2 pi p/q (q up to 12): after q relative periods they close in the inertial frame, and so do their k fold repeats.
# where is such a member in (T*, L*) and which of my 102 orbits (85 + the 17 of the arclength list) is closest to it? only the range of the printed rows is covered (L* up to 0.36,
# theta down to -2.49, so p/q up to about 0.40): T* and theta are fitted by polynomials of degree 6 in L* through the 8 derived rows of data/liao2025-scaled.json (needs numpy).
# distance = the larger of the relative differences in T* and L*, the T* of the member is k q T*(L*).   python tools/ia3-rational.py
import json, math, os
import numpy as np
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load(f): return json.load(open(os.path.join(root, 'data', f)))
rows = sorted((r for r in load('liao2025-scaled.json') if r['family'] == 'IA-3'), key=lambda r: r['Lstar'])
L = np.array([r['Lstar'] for r in rows]); T = np.array([r['Tstar'] for r in rows]); th = np.array([r['theta'] for r in rows])
pT = np.poly1d(np.polyfit(L, T, 6)); pth = np.poly1d(np.polyfit(L, th, 6))
Ls = np.linspace(L.min(), L.max(), 40001); ths = pth(Ls)
if not np.all(np.diff(ths) < 0): raise SystemExit('theta is not monotone in L*, the inversion below does not work')
tab, arc = load('orbit-table.json'), load('perp-arc-orbits.json')
mine = [('t%02d' % i, o['Tstar'], o['Lstar']) for i, o in enumerate(tab)] + [('a%02d' % i, a['ts'], abs(a['ls'])) for i, a in enumerate(arc)]
out = []
for q in range(2, 13):
    for p in range(1, q):
        if math.gcd(p, q) != 1 or not th.min() <= -2 * math.pi * p / q <= 0: continue
        Lstar = float(np.interp(-2 * math.pi * p / q, ths[::-1], Ls[::-1])); Tm = float(pT(Lstar))
        for k in range(1, 5):
            Tp = k * q * Tm
            d, name, t, l = min((max(abs(m[1] - Tp) / Tp, abs(m[2] - Lstar) / Lstar), m[0], m[1], m[2]) for m in mine)
            out.append((d, p, q, k, Lstar, Tp, name, t, l))
out.sort()
print('fit residuals over the 8 rows: T* %.1e, theta %.1e' % (np.abs(pT(L) - T).max(), np.abs(pth(L) - th).max()))
print('%d members theta = -p/q turn (q <= 12, k <= 4 repeats), L* of the rows %.3f to %.3f; the closest of my 102 orbits:' % (len(out), L.min(), L.max()))
for d, p, q, k, Lstar, Tp, name, t, l in out[:5]:
    print('  %.3f  theta = -%d/%d turn, k = %d: L* = %.4f, T* = %.2f   closest %s (T* = %.2f, L* = %.4f)' % (d, p, q, k, Lstar, Tp, name, t, l))
# the syzygy word of the IA-3 rows is (01012)^2 at all 8 printed rows (computed with src/topology.js from the start values, which are not in this repository), root 01012; the table column wordRoot has no such orbit
print('orbits of the table with the word root 01012 of the IA-3 rows:', sum(o['wordRoot'] == '01012' for o in tab))
