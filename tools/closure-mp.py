# closure of the 85 orbits of the perpendicular search after one period, from the double precision start values of data/orbit-table.json,
# integrated in multiple precision (the Gragg-Bulirsch-Stoer code of tools/refine-mp.py, 40 digits, tolerance 1e-26).
# the closure is the one of the README: largest difference of a position or velocity component between the end state and the start state (max norm),
# best rotation removed. the start is the double precision number itself (converted exactly), so this measures how well those doubles close,
# not how well the orbit closes; for that see data/refined (30 digits).
# python tools/closure-mp.py          prints the counts and the orbits above 1e-8      (about 10 minutes, uses 4 processes)
# python tools/closure-mp.py --write  also writes data/closure-mp.json
import sys, os, json, importlib.util
from multiprocessing import Pool
from mpmath import mp, mpf, nstr, cos, sin, atan2

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
spec = importlib.util.spec_from_file_location('refine_mp', os.path.join(here, 'refine-mp.py'))
R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)

def closure_mp(k):
    mp.dps = 40; tol = mpf(10) ** (-26)
    f = TABLE[k]
    u1, u2, lam, t = [mpf(float(f[q])) for q in ('u1', 'u2', 'lam', 't')]
    x0 = R.start(u1, u2, lam); x = R.flow(x0, 2 * t, tol)
    A = [(x[2 * i], x[2 * i + 1]) for i in range(6)]; B = [(x0[2 * i], x0[2 * i + 1]) for i in range(6)]
    C = sum(a[0] * b[0] + a[1] * b[1] for a, b in zip(A, B)); S = sum(a[0] * b[1] - a[1] * b[0] for a, b in zip(A, B))
    th = atan2(S, C); c, s = cos(th), sin(th)
    e = max(max(abs(c * a[0] - s * a[1] - b[0]), abs(s * a[0] + c * a[1] - b[1])) for a, b in zip(A, B))
    return dict(row=k, Tstar=f['Tstar'], closureTier=f['closureTier'], closureMP=float(e), rotation=float(th), closureDP45=f['closureDP45'], closureBS=f['closureBS'])

TABLE = json.load(open(os.path.join(root, 'data', 'orbit-table.json')))

if __name__ == '__main__':
    with Pool(4) as p: out = p.map(closure_mp, range(len(TABLE)), chunksize=1)
    rel = [o for o in out if o['closureTier'] == 'reliable']; weak = [o for o in out if o['closureTier'] != 'reliable']
    print('%d orbits. tier reliable (double precision integrators, column closureTier): %d, of which below 1e-8 in multiple precision: %d, below 1e-7: %d, worst %.3g'
          % (len(out), len(rel), sum(o['closureMP'] < 1e-8 for o in rel), sum(o['closureMP'] < 1e-7 for o in rel), max(o['closureMP'] for o in rel)))
    print('   above 1e-8:', ', '.join('t%02d %.3g' % (o['row'], o['closureMP']) for o in rel if o['closureMP'] >= 1e-8))
    print('tier weak: %d, of which below 1e-8: %d, below 1e-6: %d, worst %.3g' % (len(weak), sum(o['closureMP'] < 1e-8 for o in weak), sum(o['closureMP'] < 1e-6 for o in weak), max(o['closureMP'] for o in weak)))
    print('   above 1e-6:', ', '.join('t%02d %.3g' % (o['row'], o['closureMP']) for o in weak if o['closureMP'] >= 1e-6))
    if '--write' in sys.argv:
        json.dump(dict(note='closure after one period from the double precision start values of data/orbit-table.json, 40 digit Gragg-Bulirsch-Stoer (tools/closure-mp.py); row = index in orbit-table.json (the t.. of the README)', orbits=out),
                  open(os.path.join(root, 'data', 'closure-mp.json'), 'w'), indent=1)
        print('written data/closure-mp.json')
