# SPDX-License-Identifier: MIT
# the reference matrix of a piece of the multiple shooting for the matrix errors of data/deep/extra/fd-comparison.json (part 1): central differences of the multiple precision flow of tools/refine-mp.py
# (the unregularised Gragg-Bulirsch-Stoer flow of tools/piece-mp.py, 60 digits, tolerance 1e-42, step floor 1e-25) with the increment H added to and subtracted from one start component, 24 flows per piece:
#   Mref[i][c] = (end_i(x + H e_c) - end_i(x - H e_c)) / (2 H),   i, c = 0..11 (the 12 components of a piece: three positions, then three velocities, as in src/ias/reg.js).
# The start state (the stored doubles, exactly) and tau of the piece are those of a file written by tools/piece-ends.mjs (the piece with the number PIECE of the step STEP of a trace); the file of the first piece of
# the table is made by  node tools/piece-ends.mjs t35m 10 pe-t35m-10.json  (the piece 17).
#   python tools/fd-reference.py one PE.json PIECE OUTFILE COMP SIGN H       one flow: the start of the piece with component COMP changed by SIGN*H (COMP -1: the unperturbed start); writes OUTFILE (new): end (55 digits), steps, seconds
#   python tools/fd-reference.py run OUTDIR PE.json PIECE[,PIECE...] H[,H...] [--jobs 3] [--base] [--resume]   all flows of the pieces for the increments (24 per piece and increment; --base adds the unperturbed flow);
#                                  existing outputs are not overwritten (the run stops; --resume makes only the flows that are not there)
#   python tools/fd-reference.py assemble OUTDIR OUT.json PE.json PIECE H [H2]   the matrix Mref(H) of a piece from its flows (OUT.json must be new), its largest entry, and with H2 also Mref(H2) and the largest
#                                  |Mref(H) - Mref(H2)| / max|Mref(H)| (the table used H = 1e-14, checked against 1e-12 on the deepest piece: they agree to 7.7e-19)
# The error of a matrix M in fd-comparison.json is max over the 144 entries of |M - Mref| / max|Mref|. The longest flow of a piece of the table takes 14 to 64 seconds (H = 1e-14; 25 flows with the unperturbed one, 3 at a time).
import sys, os, json, time, subprocess, importlib.util
sys.dont_write_bytecode = True
here = os.path.dirname(os.path.abspath(__file__))
DIGITS, TOL, FLOOR = 60, '1e-42', '1e-25'


def load_piece(pefile, piece):
    pe = json.load(open(pefile, encoding='utf8'))
    p = [x for x in pe['pieces'] if x['piece'] == piece]
    if not p: sys.exit('no piece %d in %s' % (piece, pefile))
    return pe, p[0]


def name(d, tag, piece, comp, sign, h):
    return '%s/%s_p%02d_h%s_%s.json' % (d, tag, piece, h, 'base' if comp < 0 else 'c%02d%s' % (comp, 'p' if sign > 0 else 'm'))


def tag_of(pe): return '%s_%d' % (pe['label'], pe['taken_step'])


def one(pefile, piece, outf, comp, sign, h):
    from mpmath import mp, mpf, nstr
    mp.dps = DIGITS
    spec = importlib.util.spec_from_file_location('refine_mp', os.path.join(here, 'refine-mp.py'))
    R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
    R.STEP_FLOOR = mpf(FLOOR); mp.dps = DIGITS
    pe, p = load_piece(pefile, piece); x0 = [mpf(v) for v in p['start']]
    if comp >= 0: x0[comp] = x0[comp] + sign * mpf(h)
    count = dict(steps=0); orig = R.bs_step

    def counted(x, H, tol):
        r, order = orig(x, H, tol)
        if r is not None: count['steps'] += 1
        return r, order

    R.bs_step = counted
    t0 = time.time(); end = R.flow(x0, mpf(p['tau']), mpf(TOL))
    res = dict(piece=piece, comp=comp, sign=sign, h=h, steps=count['steps'], seconds=round(time.time() - t0, 1), end=[nstr(v, 55) for v in end])
    with open(outf, 'x') as f: json.dump(res, f, indent=0)
    print(json.dumps({k: v for k, v in res.items() if k != 'end'}))


def run(d, pefile, pieces, hs, jobs, base, resume):
    from concurrent.futures import ThreadPoolExecutor
    pe = json.load(open(pefile, encoding='utf8')); tag = tag_of(pe)
    os.makedirs(d, exist_ok=True); todo = []
    for piece in pieces:
        for h in hs:
            if base: todo.append((name(d, tag, piece, -1, 0, h), piece, -1, 0, h))
            for c in range(12):
                for s in (1, -1): todo.append((name(d, tag, piece, c, s, h), piece, c, s, h))
    if resume: todo = [t for t in todo if not os.path.exists(t[0])]
    for t in todo:
        if os.path.exists(t[0]): sys.exit('exists, not overwriting: ' + t[0])

    def go(t):
        r = subprocess.run([sys.executable, '-B', os.path.abspath(__file__), 'one', pefile, str(t[1]), t[0], str(t[2]), str(t[3]), t[4]], capture_output=True, text=True)
        print(os.path.basename(t[0]), r.stdout[-160:].strip(), r.stderr[-300:].strip(), flush=True)

    with ThreadPoolExecutor(jobs) as ex: list(ex.map(go, todo))


def matrix(d, tag, piece, h):
    from mpmath import mp, mpf
    mp.dps = DIGITS
    M = [[None] * 12 for _ in range(12)]
    for c in range(12):
        a = json.load(open(name(d, tag, piece, c, 1, h))); b = json.load(open(name(d, tag, piece, c, -1, h)))
        for i in range(12): M[i][c] = (mpf(a['end'][i]) - mpf(b['end'][i])) / (2 * mpf(h))
    return M


def assemble(d, out, pefile, piece, h, h2):
    from mpmath import mp, mpf
    mp.dps = DIGITS
    if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    pe = json.load(open(pefile, encoding='utf8')); tag = tag_of(pe)
    M = matrix(d, tag, piece, h); mx = max(abs(M[i][c]) for i in range(12) for c in range(12))
    res = dict(piece=piece, h=h, max_abs=float(mx), M=[[float(M[i][c]) for c in range(12)] for i in range(12)])
    if h2:
        M2 = matrix(d, tag, piece, h2); diff = max(abs(M[i][c] - M2[i][c]) for i in range(12) for c in range(12)) / mx
        res.update(h2=h2, M2=[[float(M2[i][c]) for c in range(12)] for i in range(12)], max_rel_difference_h_h2=float(diff))
        print('piece', piece, 'max |Mref(%s) - Mref(%s)| / max|Mref| = %.3e' % (h, h2, float(diff)))
    with open(out, 'x') as f: json.dump(res, f, indent=0)
    print('written', out, 'max|Mref|', float(mx))


a = sys.argv
if len(a) < 2 or a[1] not in ('one', 'run', 'assemble'): sys.exit('usage: see the header of tools/fd-reference.py')
if a[1] == 'one': one(a[2], int(a[3]), a[4], int(a[5]), int(a[6]), a[7])
elif a[1] == 'run':
    jobs = int(a[a.index('--jobs') + 1]) if '--jobs' in a else 3
    run(a[2], a[3], [int(x) for x in a[4].split(',')], a[5].split(','), jobs, '--base' in a, '--resume' in a)
else: assemble(a[2], a[3], a[4], int(a[5]), a[6], a[7] if len(a) > 7 else None)
