# converts the rows of Table 1 of Li, Tao, Li and Liao 2025 (data/liao2025-table1.json) to the scale free numbers T* = T |E|^1.5 and L* = |L| |E|^0.5
# and checks the conversion against numbers that are known independently: the L = 0 figure-eight (T* = 9.238), the L of the paper against the L recomputed from the rows,
# and the smooth run of T* along each family (the raw period of the paper jumps between L = 0.011 and 0.012 because the rows are scaled differently)
# python tools/liao2025-scale.py      exits with 1 when a check fails or a list is empty
import json, math, sys
try: rows = json.load(open('data/liao2025-table1.json'))['rows']
except FileNotFoundError: sys.exit('this script needs data/liao2025-table1.json, the table of Li et al. 2025 typed in by the reader; it is not in this repository')
if len(rows) != 18 or sum(1 for r in rows if r['family'] == 'figure-eight') != 10 or sum(1 for r in rows if r['family'] == 'IA-3') != 8:
    sys.exit('expected 18 rows (10 figure-eight, 8 IA-3), got %d' % len(rows))
out = []
for r in rows:
    pos = [(r['y1'], 0.0), (1.0, 0.0), (0.0, 0.0)]
    vel = [(r['y7'], r['y8']), (r['y9'], r['y10']), (r['y11'], r['y12'])]
    cx = sum(p[0] for p in pos) / 3; vx = sum(v[0] for v in vel) / 3; vy = sum(v[1] for v in vel) / 3
    pos = [(p[0] - cx, p[1]) for p in pos]; vel = [(v[0] - vx, v[1] - vy) for v in vel]
    K = 0.5 * sum(a * a + b * b for a, b in vel)
    U = -sum(1 / math.dist(pos[i], pos[j]) for i in range(3) for j in range(i + 1, 3))
    E = K + U
    L = sum(p[0] * v[1] - p[1] * v[0] for p, v in zip(pos, vel))
    out.append({'family': r['family'], 'L_paper': r['L'], 'L_formula': r['y1'] * r['y8'] + r['y10'], 'L_recomputed': L, 'E': E, 'Tstar': r['T'] * abs(E) ** 1.5, 'Lstar': abs(L) * abs(E) ** 0.5, 'theta': r['theta'], 'theta_over_2pi': r['theta'] / (2 * math.pi)})
# only the derived scale free numbers are written, no start value and no printed period of the table; 'L_paper' is the printed L, used as the label of the row
slim = [{'family': o['family'], 'L_paper': o['L_paper'], 'Tstar': float('%.10g' % o['Tstar']), 'Lstar': float('%.10g' % o['Lstar']), 'theta': float('%.10g' % o['theta'])} for o in out]
json.dump(slim, open('data/liao2025-scaled.json', 'w'), indent=1)
bad = 0
def check(name, ok, detail):
    global bad
    print(('ok   ' if ok else 'FAIL ') + name + ': ' + detail)
    if not ok: bad += 1
f8 = [o for o in out if o['family'] == 'figure-eight']; ia = [o for o in out if o['family'] == 'IA-3']
check('figure-eight L = 0', abs(f8[0]['Tstar'] - 9.238) < 2e-3, 'T* = %.4f (known value 9.238 from T = 6.3259, E = -1.2871)' % f8[0]['Tstar'])
check('IA-3 L = 0', abs(ia[0]['Tstar'] - 15.05) < 5e-3, 'T* = %.4f (about 15.05)' % ia[0]['Tstar'])
check('IA-3 L = 0.35', abs(ia[-1]['Lstar'] - 0.36) < 5e-3, 'L* = %.4f (about 0.36)' % ia[-1]['Lstar'])
for name, fam, tol in (('figure-eight', f8, 5e-3), ('IA-3', ia, 5e-3)):
    spread = (max(o['Tstar'] for o in fam) - min(o['Tstar'] for o in fam)) / fam[0]['Tstar']
    check(name + ' T* along the family', spread < 0.02, 'T* from %.3f to %.3f (raw T from %.2f to %.2f)' % (min(o['Tstar'] for o in fam), max(o['Tstar'] for o in fam), min(r['T'] for r in rows if r['family'] == fam[0]['family']), max(r['T'] for r in rows if r['family'] == fam[0]['family'])))
# the paper's own formula L = y1 y8 + y10 (column names of data/liao2025-table1.json) against the printed L
for fam in (f8, ia):
    print('L = y1 y8 + y10 minus printed L, %s: from %.1e to %.1e' % (fam[0]['family'], min(o['L_formula'] - o['L_paper'] for o in fam), max(o['L_formula'] - o['L_paper'] for o in fam)))
check('figure-eight rows: formula L agrees with printed L', max(abs(o['L_formula'] - o['L_paper']) for o in f8) < 1e-7, 'to better than 1e-7')
check('IA-3 rows: formula L is 1e-4 above the printed L', all(abs(o['L_formula'] - o['L_paper'] - 1e-4) < 1e-7 for o in ia[1:]) and abs(ia[0]['L_formula']) < 1e-7, 'all 7 rows with L > 0')
worst = max(abs(o['L_recomputed'] - o['L_paper']) for o in out)
print('largest |L recomputed - L printed| = %.2e (figure-eight %.1e, IA-3 %.1e)' % (worst, max(abs(o['L_recomputed'] - o['L_paper']) for o in f8), max(abs(o['L_recomputed'] - o['L_paper']) for o in ia)))
for o in out:
    print('%-12s L=%5.3f E=%8.4f T*=%7.3f L*=%6.3f theta/2pi=%7.4f' % (o['family'], o['L_paper'], o['E'], o['Tstar'], o['Lstar'], o['theta_over_2pi']))
sys.exit(1 if bad else 0)
