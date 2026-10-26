# the 3 x 4 Jacobian d(r1, r2, r3)/d(u1, u2, t, lam) of the closing conditions of tools/reclose.py (the unregularised flow, 50 digits) at stored points near the end of a creeping trace, its singular
# values relative to the largest, and the limit of lam from Aitken's delta-squared on the stored lam of the accepted steps. If the closing conditions lost rank at the stall, sigma3/sigma1 would fall
# in proportion to the distance |lam - lam_lim|.
#   python tools/stall-jacobian-mp.py prepare DIR            DIR must be new: picks the accepted steps nearest to the asked loop steps (t35 - 165, 700, 1227, 2190; t44 - 588, 1588) and writes
#                                                            DIR/jobs/<id>.json (the jobs of tools/reclose.py), DIR/selection.json and DIR/points.json (for tools/point-diagnostic.py)
#   python tools/stall-jacobian-mp.py reclose DIR [JOBS]  runs tools/reclose.py on every job (default 3 at a time), the results go to DIR/res/<id>.json; 75 to 170 s for a point on the machine of the stored run
#   python tools/stall-jacobian-mp.py jacobian DIR OUT.json  reads DIR/res/<id>.json and writes OUT.json (new): the singular values, lam_lim, the distances and a summary
# The multipliers of t44 - at its step 1588 come from tools/point-diagnostic.py with --mult-only on DIR/points.json (about 20 minutes, 40 digits):
#   python tools/point-diagnostic.py DIR/points.json t44m-s1588 OUT.json --mult-only
import sys, os, json, glob, math, time, subprocess, importlib.util
from concurrent.futures import ThreadPoolExecutor
sys.dont_write_bytecode = True

here = os.path.dirname(os.path.abspath(__file__))
traces = os.path.join(os.path.dirname(here), 'data', 'deep', 'traces')
WANT = {'t35m': [165, 700, 1227, 2190], 't44m': [588, 1588]}


def prepare(out):
    if os.path.exists(out):
        sys.exit('exists, not overwriting: ' + out)
    os.makedirs(out + '/jobs')
    sel = []
    for lab, steps in WANT.items():
        d = json.load(open(os.path.join(traces, lab + '.json')))
        el = sorted(d['points'] + d['unrecorded'], key=lambda e: e['step'])
        for s in steps:
            e = min(el, key=lambda x: (abs(x['step'] - s), x['step']))
            idx = [k for k, x in enumerate(el) if x['step'] == e['step']][0]
            sel.append(dict(id='%s-s%d' % (lab, e['step']), trace=lab, asked=s, taken=e['step'], index=idx, n_accepted=len(el), lam=e['lam'], u1=e['u1'], u2=e['u2'], t=e['t']))
            json.dump(dict(id=sel[-1]['id'], u1=e['u1'], u2=e['u2'], lam=e['lam'], t=e['t'], ref=dict(u1=e['u1'], u2=e['u2'], t=e['t'])), open('%s/jobs/%s.json' % (out, sel[-1]['id']), 'x'))
    json.dump(sel, open(out + '/selection.json', 'x'), indent=1)
    json.dump([dict(id=x['id'], u1=x['u1'], u2=x['u2'], lam=x['lam'], t=x['t']) for x in sel], open(out + '/points.json', 'x'))
    for x in sel:
        print(x['id'], 'asked', x['asked'], 'taken', x['taken'], 'accepted index', x['index'], 'of', x['n_accepted'], 'lam', x['lam'])


def reclose(d, jobs):
    os.makedirs(d + '/res', exist_ok=True)

    def run(j):
        i = os.path.basename(j)[:-5]
        t0 = time.time()
        r = subprocess.run([sys.executable, '-B', os.path.join(here, 'reclose.py'), j, '%s/res/%s.json' % (d, i), '--minutes', '120'], capture_output=True, text=True)
        print(i, r.stdout.strip()[-160:], r.stderr.strip()[-160:], round(time.time() - t0), 's', flush=True)
    with ThreadPoolExecutor(jobs) as ex:
        list(ex.map(run, sorted(glob.glob(d + '/jobs/*.json'))))
    print('done all', flush=True)


def jacobian(d1, out):
    if os.path.exists(out):
        sys.exit('exists, not overwriting: ' + out)
    from mpmath import mp, mpf, sqrt, matrix, svd_r
    spec = importlib.util.spec_from_file_location('refine_mp', os.path.join(here, 'refine-mp.py'))
    R = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(R)
    R.STEP_FLOOR = mpf('1e-20')
    mp.dps = 50
    TOL = mpf(10) ** (-30)
    H = mpf(10) ** (-25)

    def resid(s):
        big = mpf(0); dx = mpf(1); dy = mpf(0)
        for i in range(3):
            for j in range(i + 1, 3):
                rx = s[2 * j] - s[2 * i]; ry = s[2 * j + 1] - s[2 * i + 1]; l = rx * rx + ry * ry
                if l > big:
                    big = l; n = sqrt(l); dx = rx / n; dy = ry / n
        return [((s[2] - s[0]) * (s[5] - s[1]) - (s[3] - s[1]) * (s[4] - s[0])) / big, s[6] * dx + s[7] * dy, s[8] * dx + s[9] * dy]

    def F(a, b, tt, lam):
        s = R.flow(R.start(a, b, lam), tt, TOL)
        return resid(s), s

    sel = json.load(open(d1 + '/selection.json'))
    rows = []
    lines = []
    for x in sel:
        r = json.load(open('%s/res/%s.json' % (d1, x['id'])))
        u1, u2, t = [mpf(r[k]) for k in ('u1', 'u2', 't')]
        lam = mpf(str(x['lam']))
        r0, s0 = F(u1, u2, t, lam)
        A = matrix(3, 4)
        for c, args in enumerate([(u1 + H, u2, t, lam), (u1, u2 + H, t, lam)]):
            rq, _ = F(*args)
            for k in range(3): A[k, c] = (rq[k] - r0[k]) / H
        f = R.deriv(s0)
        rt = resid([a + H * b for a, b in zip(s0, f)])
        for k in range(3): A[k, 2] = (rt[k] - r0[k]) / H
        rl, _ = F(u1, u2, t, lam + H)
        for k in range(3): A[k, 3] = (rl[k] - r0[k]) / H
        sv = svd_r(A, compute_uv=False)
        sv = sorted([sv[i] for i in range(len(sv))], reverse=True)
        d = json.load(open(os.path.join(traces, x['trace'] + '.json')))
        el = sorted(d['points'] + d['unrecorded'], key=lambda e: e['step'])
        lamv = [e['lam'] for e in el]

        def aitken(n):
            a, b, c = lamv[n - 200], lamv[n - 100], lamv[n]
            den = (c - b) - (b - a)
            return (c - (c - b) ** 2 / den) if den != 0 else None
        n = len(lamv) - 1
        lim1 = aitken(n)
        lim2 = aitken(n - 200) if n >= 400 else None
        lim = lim1 if lim1 is not None else lamv[-1]
        dist = abs(float(lam) - lim)
        row = dict(id=x['id'], trace=x['trace'], step=x['taken'], lam=float(lam), residual_reclose=r['residual'], updates=len(r['iterations']) - 1, sigma=[float(v) for v in sv], s2_over_s1=float(sv[1] / sv[0]),
                   s3_over_s1=float(sv[2] / sv[0]), aitken_last=lim1, aitken_earlier=lim2, lam_lim=lim, dist=dist, seconds=r.get('elapsed_s'))
        rows.append(row)
        lines.append('%s (step %d): sigma %s; sigma2/sigma1 %.3e, sigma3/sigma1 %.3e; lam %.12f, lam_lim %s (earlier triple %s), |lam - lam_lim| %.3e' % (
            x['id'], x['taken'], ' '.join('%.3e' % float(v) for v in sv), row['s2_over_s1'], row['s3_over_s1'], float(lam), ('%.12f' % lim1) if lim1 is not None else 'none (lam constant)',
            ('%.12f' % lim2) if lim2 is not None else 'none', dist))
    t35 = [r for r in rows if r['trace'] == 't35m' and r['dist'] > 1e-12]
    if len(t35) >= 3:
        xs = [math.log(r['dist']) for r in t35]; ys = [math.log(r['s3_over_s1']) for r in t35]
        mx = sum(xs) / len(xs); my = sum(ys) / len(ys)
        slope = sum((a - mx) * (b - my) for a, b in zip(xs, ys)) / sum((a - mx) ** 2 for a in xs)
        fall = t35[0]['s3_over_s1'] / t35[-1]['s3_over_s1']; span = t35[0]['dist'] / t35[-1]['dist']
        lines.append('t35 - points used %d: log-log slope of sigma3/sigma1 against |lam - lam_lim| %.3f; sigma3/sigma1 first/last %.3g; distance first/last %.3g' % (len(t35), slope, fall, span))
    t44 = [r for r in rows if r['trace'] == 't44m']
    if len(t44) == 2:
        lines.append('t44 - sigma3/sigma1 at step %d / at step %d: %.3g' % (t44[0]['step'], t44[1]['step'], t44[0]['s3_over_s1'] / t44[1]['s3_over_s1']))
    what = ('the 3 x 4 Jacobian d(r1, r2, r3)/d(u1, u2, t, lam) of the closing conditions of tools/reclose.py (unregularised flow, 50 digits) at stored points of t35 - (loop steps 165, 700, 1227, 2190) and t44 - '
            '(588, 1588), re-closed at their lam: the singular values sigma, sigma2/sigma1 and sigma3/sigma1, lam_lim (Aitken delta-squared on the stored lam of the accepted steps) and the distance |lam - lam_lim|. '
            'If the closing conditions lost rank, sigma3/sigma1 would fall in proportion to the distance. These are the stored results of the commands in "command" (the re-closing takes 75 to 170 s for a point); '
            'the re-closed values are in the raw files (stall/jacobian/res/).')
    cmd = ['python tools/stall-jacobian-mp.py prepare stall/jacobian', 'python tools/stall-jacobian-mp.py reclose stall/jacobian', 'python tools/stall-jacobian-mp.py jacobian stall/jacobian OUT.json']
    json.dump(dict(what=what, command=cmd, summary=lines, rows=rows), open(out, 'x'), indent=1)
    print('\n'.join(lines))


if len(sys.argv) >= 3 and sys.argv[1] == 'prepare':
    prepare(sys.argv[2])
elif len(sys.argv) >= 3 and sys.argv[1] == 'reclose':
    reclose(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 3)
elif len(sys.argv) >= 4 and sys.argv[1] == 'jacobian':
    jacobian(sys.argv[2], sys.argv[3])
else:
    sys.exit(__doc__ if __doc__ else 'usage: python tools/stall-jacobian-mp.py prepare DIR | reclose DIR [JOBS] | jacobian DIR OUT.json')
