# closure after one period of the refined start values as they are STORED in data/refined (30 digits), integrated in multiple precision
# (the Gragg-Bulirsch-Stoer code of tools/refine-mp.py, 50 digits, tolerance 1e-30). closure as in the README: largest difference of a position or velocity component
# between the end state and the start state (max norm), best rotation removed. the number closure_full_period inside the files is not this one: before 2026-10-10
# tools/refine-mp.py measured it on its unrounded solution and wrote the start values rounded to 30 digits, and for strongly unstable orbits the rounding is amplified.
# python tools/closure-stored.py          prints the counts (about 6 minutes, uses 4 processes)
# python tools/closure-stored.py --write  also writes data/closure-stored.json
import sys, os, json, glob, importlib.util
from multiprocessing import Pool
from mpmath import mp, mpf, cos, sin, atan2

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
spec = importlib.util.spec_from_file_location('refine_mp', os.path.join(here, 'refine-mp.py'))
R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
TABLE = json.load(open(os.path.join(root, 'data', 'orbit-table.json')))

def row_of(d):          # the row of data/orbit-table.json whose double start values the file started from (None for the orbit of the arclength list)
    sd = d['start_double']
    for i, o in enumerate(TABLE):
        if abs(float(sd['lam']) - o['lam']) + abs(float(sd['u1']) - o['u1']) < 1e-6: return i
    return None

def closure_stored(fn):
    mp.dps = 50; tol = mpf(10) ** (-30)
    d = json.load(open(fn))
    u1, u2, lam, t = [mpf(d[q]) for q in ('u1', 'u2', 'lam', 't')]
    x0 = R.start(u1, u2, lam); x = R.flow(x0, 2 * t, tol)
    A = [(x[2 * i], x[2 * i + 1]) for i in range(6)]; B = [(x0[2 * i], x0[2 * i + 1]) for i in range(6)]
    C = sum(a[0] * b[0] + a[1] * b[1] for a, b in zip(A, B)); S = sum(a[0] * b[1] - a[1] * b[0] for a, b in zip(A, B))
    th = atan2(S, C); c, s = cos(th), sin(th)
    e = max(max(abs(c * a[0] - s * a[1] - b[0]), abs(s * a[0] + c * a[1] - b[1])) for a, b in zip(A, B))
    return dict(file=os.path.relpath(fn, root).replace(os.sep, '/'), row=row_of(d), closureStored=float(e), closureInFile=float(d['closure_full_period']))

if __name__ == '__main__':
    files = sorted(f for f in glob.glob(os.path.join(root, 'data', 'refined', '**', '*.json'), recursive=True) if not f.endswith('summary.json'))
    with Pool(4) as p: out = p.map(closure_stored, files, chunksize=1)
    bad = sorted((o for o in out if o['closureStored'] > 1e-20), key=lambda o: o['closureStored'])
    print('%d files; closure of the stored values above 1e-20: %d, worst %.3g; the number stored in the files is above 1e-20 in %d'
          % (len(out), len(bad), max(o['closureStored'] for o in out), sum(o['closureInFile'] > 1e-20 for o in out)))
    print('   above 1e-20:', ', '.join('%s %.2g' % ('t%02d' % o['row'] if o['row'] is not None else 'a', o['closureStored']) for o in bad))
    if '--write' in sys.argv:
        json.dump(dict(note='closure after one period of the start values stored in data/refined/*.json, 50 digit Gragg-Bulirsch-Stoer (tools/closure-stored.py); row = index in data/orbit-table.json (null: the T* = 29.31 orbit of the arclength list); closureInFile is the number written by tools/refine-mp.py',
                       orbits=out), open(os.path.join(root, 'data', 'closure-stored.json'), 'w'), indent=1)
        print('written data/closure-stored.json')
