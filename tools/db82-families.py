# every converted row of Davoust and Broucke (1982) (data/db82-*-converted.json) against the four families t35 -, t44 -, t62 -, t72 - (the stored curve of T*, L* from data/deep/traces/*.json and the start
# orbit of the family from data/orbit-table.json), as the orbit and as an n-fold repeat (the row = n times the family orbit for n = 1 to 9, the family orbit = n times the row for n = 2 to 9), in T* and L* and
# in the turns modulo 1 with both signs. A row is a MATCH if its distance to the polyline (or to the start orbit) is at most 1e-5 in the normalised (T*, L*) and the turns agree to 1e-4; it is near
# if the distance is at most 1e-3. T* and L* of a step that has no recorded closest approach are taken from its start values; its turns are interpolated in lam between the recorded neighbours.
#   python tools/db82-families.py OUT.json     OUT.json must be new; needs numpy; takes a few seconds. Prints the result for every family.
import json, math, os, sys
import numpy as np

PUB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data') + '/'
if len(sys.argv) != 2:
    sys.exit('usage: python tools/db82-families.py OUT.json')
out = sys.argv[1]
if os.path.exists(out):
    sys.exit('exists, not overwriting: ' + out)

# closed form T*, L* of a start (as perpInfo does from s0 and T = 2t)
def tsls(u1, u2, lam, t):
    cm = lam / 3
    x = [-1 - cm, lam - cm, 1 - cm]
    v = [u1, u2, -u1 - u2]
    E = 0.5 * sum(a * a for a in v) - (1 / abs(x[1] - x[0]) + 1 / abs(x[2] - x[0]) + 1 / abs(x[2] - x[1]))
    L = sum(xi * vi for xi, vi in zip(x, v))
    T = 2 * t
    return T * abs(E) ** 1.5, abs(L) * abs(E) ** 0.5

rows = []
for f in ['A1', 'table3', 'table4', 'table5', 'table6', 'table7']:
    for r in json.load(open(PUB + 'db82-%s-converted.json' % f)):
        closed = r['ts'] is not None and r['theta'] is not None and r['closeRes'] <= 1e-9
        ts_, ls_ = (r['ts'], abs(r['ls'])) if r['ts'] is not None else tsls(r['u1'], r['u2'], r['lam'], r['t'])   # no integration needed for T*, L*
        rows.append(dict(file=f, N=r['N'], ts=ts_, ls=ls_, theta=r['theta'] if closed else None, closeRes=r['closeRes'], closed=closed))
orb = json.load(open(PUB + 'orbit-table.json'))
fams = {}
for lab, row in [('t35m', 35), ('t44m', 44), ('t62m', 62), ('t72m', 72)]:
    d = json.load(open(PUB + 'deep/traces/%s.json' % lab))
    pts = [dict(step=p['step'], lam=p['lam'], T=p['Tstar'], L=abs(p['Lstar']), turns=p['turns'], kind='r') for p in d['points']]
    unr = []
    for u in d['unrecorded']:
        T, L = tsls(u['u1'], u['u2'], u['lam'], u['t'])
        unr.append(dict(step=u['step'], lam=u['lam'], T=T, L=L, turns=None, kind='u'))
    allp = sorted(pts + unr, key=lambda e: e['step'])
    # turns of an unrecorded step: linear in lam between the nearest recorded neighbours
    rec = [e for e in allp if e['kind'] == 'r']
    for e in allp:
        if e['turns'] is None:
            lo = max((x for x in rec if x['step'] < e['step']), key=lambda x: x['step'], default=None)
            hi = min((x for x in rec if x['step'] > e['step']), key=lambda x: x['step'], default=None)
            if lo and hi and hi['lam'] != lo['lam']:
                e['turns'] = lo['turns'] + (hi['turns'] - lo['turns']) * (e['lam'] - lo['lam']) / (hi['lam'] - lo['lam'])
    o = orb[row]
    start = dict(T=o['Tstar'], L=abs(o['Lstar']), turns=o['rotation'] / (2 * math.pi), lam=o['lam'])
    fams[lab] = dict(poly=allp, start=start, row=row)


def near_segment(P, Q, A, B):
    """normalised coordinates: the row is at (1, 1); P, Q = segment ends already divided by the row's (T, L); returns d, s"""
    P = np.asarray(P); Q = np.asarray(Q); O = np.array([1.0, 1.0])
    D = Q - P; dd = D @ D
    s = 0.0 if dd == 0 else float(np.clip(((O - P) @ D) / dd, 0, 1))
    X = P + s * D
    return float(np.hypot(*(X - O))), s


def dist_int(x):
    return abs(x - round(x))


res = {}; txt = ''
for lab, fam in fams.items():
    poly = fam['poly']
    T = np.array([e['T'] for e in poly]); L = np.array([e['L'] for e in poly])
    txt += '%s: curve of %d accepted steps (%d recorded, %d unrecorded with T*, L* from the start values), T* %.5f .. %.5f, L* %.5f .. %.5f; start orbit (row %d of orbit-table): T* %.5f, L* %.5f, lam %.5f\n' % (
        lab, len(poly), sum(e['kind'] == 'r' for e in poly), sum(e['kind'] == 'u' for e in poly), T.min(), T.max(), L.min(), L.max(), fam['row'], fam['start']['T'], fam['start']['L'], fam['start']['lam'])
    best = []
    for r in rows:
        cands = []
        for dirn, n in [('A', k) for k in range(1, 10)] + [('B', k) for k in range(2, 10)]:   # A: the row is n times the family orbit, B: the family orbit is n times the row
            Tr = (r['ts'] / n if dirn == 'A' else r['ts'] * n); Lr = r['ls']
            kr, kc = (1, n) if dirn == 'A' else (n, 1)
            # polyline segments
            xs = T / Tr; ys = L / Lr
            Dx = xs[1:] - xs[:-1]; Dy = ys[1:] - ys[:-1]; dd = Dx * Dx + Dy * Dy
            with np.errstate(divide='ignore', invalid='ignore'):
                sv = np.where(dd > 0, ((1 - xs[:-1]) * Dx + (1 - ys[:-1]) * Dy) / dd, 0.0)
            sv = np.clip(sv, 0, 1)
            dv = np.hypot(xs[:-1] + sv * Dx - 1, ys[:-1] + sv * Dy - 1)
            i = int(np.argmin(dv)); d = float(dv[i]); s = float(sv[i])
            # the start orbit as an isolated extra point
            ds = math.hypot(fam['start']['T'] / Tr - 1, fam['start']['L'] / Lr - 1)
            c = None
            ti, tj = poly[i]['turns'], poly[i + 1]['turns']
            if ti is not None and tj is not None:
                c = ti + s * (tj - ti)
            rt = r['theta'] / (2 * math.pi) if r['theta'] is not None else None
            tp = dist_int(kr * rt - kc * c) if (c is not None and rt is not None) else None
            tm = dist_int(kr * rt + kc * c) if (c is not None and rt is not None) else None
            cands.append(dict(n=dirn + str(n), d=d, seg=i, s=s, curve_turns=c, turns_diff_plus=tp, turns_diff_minus=tm, d_start_orbit=ds,
                              turns_diff_start=(min(dist_int(kr * rt - kc * fam['start']['turns']), dist_int(kr * rt + kc * fam['start']['turns'])) if rt is not None else None)))
        b = min(cands, key=lambda x: x['d'])
        bs = min(cands, key=lambda x: x['d_start_orbit'])
        match = any(x['d'] <= 1e-5 and x['turns_diff_plus'] is not None and min(x['turns_diff_plus'], x['turns_diff_minus']) <= 1e-4 for x in cands)
        match_start = any(x['d_start_orbit'] <= 1e-5 and x['turns_diff_start'] is not None and x['turns_diff_start'] <= 1e-4 for x in cands)
        near = any(x['d'] <= 1e-3 for x in cands) or any(x['d_start_orbit'] <= 1e-3 for x in cands)
        best.append(dict(file=r['file'], N=r['N'], best=b, best_start=bs, match=bool(match), match_start=bool(match_start), near=bool(near), cands=cands))
    best.sort(key=lambda x: min(x['best']['d'], x['best_start']['d_start_orbit']))
    nm = [b for b in best if b['match'] or b['match_start']]
    nn = [b for b in best if (b['near'] and not (b['match'] or b['match_start']))]
    txt += '  rows compared: %d;  MATCH (d_n <= 1e-5 and turns to 1e-4): %d;  near (d_n <= 1e-3) without match: %d\n' % (len(rows), len(nm), len(nn))
    for b in nm:
        txt += '    MATCH row %s N=%d\n' % (b['file'], b['N'])
    for b in nn:
        x = b['best']
        txt += '    near row %s N=%d: d_n %.2e (n=%s), start orbit d %.2e, turns diff %s\n' % (b['file'], b['N'], x['d'], x['n'], b['best_start']['d_start_orbit'], '%.2e/%.2e' % (x['turns_diff_plus'], x['turns_diff_minus']) if x['turns_diff_plus'] is not None else 'n/a')
    txt += '    closest 5 rows (distance to the polyline, or to the start orbit):\n'
    for b in best[:5]:
        x = b['best']; xs_ = b['best_start']
        txt += '      %s N=%3d: curve d %.3e (n=%s, s=%.2f, turns diff %s)   start-orbit d %.3e (n=%s)\n' % (b['file'], b['N'], x['d'], x['n'], x['s'], '%.2e/%.2e' % (x['turns_diff_plus'], x['turns_diff_minus']) if x['turns_diff_plus'] is not None else 'n/a', xs_['d_start_orbit'], xs_['n'])
    # how many rows could be on the stretch covered (T*, L* inside the box of the curve, widened by 1e-3)
    cover = 0
    for r in rows:
        for n in range(1, 10):
            if (T.min() * 0.999 <= r['ts'] / n <= T.max() * 1.001 or T.min() * 0.999 <= r['ts'] * n <= T.max() * 1.001) and L.min() * 0.999 <= r['ls'] <= L.max() * 1.001:
                cover += 1; break
    txt += '    rows (any n) whose (T*, L*) lies in the box of the stored stretch (widened by 0.1 %%): %d\n' % cover
    res[lab] = dict(n_rows=len(rows), n_match=len(nm), matched=[(b['file'], b['N']) for b in nm], near=[(b['file'], b['N'], b['best']['d']) for b in nn],
                    closest=[dict(file=b['file'], N=b['N'], d_curve=b['best']['d'], n=b['best']['n'], d_start=b['best_start']['d_start_orbit']) for b in best[:5]], rows_in_box=cover)
what = ('every converted row of Davoust and Broucke (1982) (%d rows, data/db82-*-converted.json) against the four families t35 -, t44 -, t62 -, t72 - (stored curve of T*, L* and turns of data/deep/traces/*.json and the '
        'start orbit of data/orbit-table.json), as the orbit and as an n-fold repeat (A1 to A9: the row is n times the family orbit; B2 to B9: the family orbit is n times the row), in T* and L* and in the turns modulo 1 with both '
        'signs: n_match = rows with a distance of at most 1e-5 (normalised T*, L*) and turns to 1e-4, near = rows with a distance of at most 1e-3, closest = the five rows nearest to the curve '
        '(d_curve) and their distance to the start orbit of the family (d_start), rows_in_box = rows whose (T*, L*) lies in the box of the stored stretch widened by 0.1 percent. '
        'These are the stored results of the command in "command"; it can be run again (a few seconds).') % len(rows)
json.dump(dict(what=what, command='python tools/db82-families.py OUT.json', families=res), open(out, 'x'), indent=1)
print(txt)
