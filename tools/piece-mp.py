# SPDX-License-Identifier: MIT
# the 50 digit end state of the pieces written by tools/piece-ends.mjs, and the comparison with the end states of IAS15 alone, reg.js and the Dormand-Prince integrator of the default route.
# Every piece is integrated from its start state (the stored doubles, exactly) over tau with the Gragg-Bulirsch-Stoer flow of tools/refine-mp.py (50 digits, tolerance 1e-30, step floor 1e-20; the
# unregularised flow of the witnesses). The distance measure is the one of the cross-check of src/ias/bridge.js: D = the largest over the 12 components of |a - mp| / max(1, |mp|);
# the largest absolute difference is given too. The smallest pair distance of a piece is the smallest of the three pair distances at the start and at every accepted step end of the 50 digit flow.
#   python tools/piece-mp.py run DIR IN1.json [IN2.json ...] [--jobs 3]     one process per piece, DIR/<label>_<step>_p<piece>.json; existing outputs are not overwritten (the run stops)
#   python tools/piece-mp.py summary DIR OUT.json IN1.json [IN2.json ...]   one row per piece with the distances, and the largest D by role and integrator (OUT.json must be new)
import sys, os, json, time, subprocess, importlib.util
sys.dont_write_bytecode = True

here = os.path.dirname(os.path.abspath(__file__))
PAIRS = [(0, 1), (0, 2), (1, 2)]


def name(d, inp, i):
    return '%s/%s_%d_p%02d.json' % (d, inp['label'], inp['taken_step'], i)


def one(infile, i, outf):
    from mpmath import mp, mpf, sqrt, nstr
    inp = json.load(open(infile)); pc = [p for p in inp['pieces'] if p['piece'] == i][0]
    spec = importlib.util.spec_from_file_location('refine_mp', os.path.join(here, 'refine-mp.py'))
    R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
    R.STEP_FLOOR = mpf('1e-20'); mp.dps = 50; tol = mpf(10) ** (-30)
    best = dict(d2=None); count = dict(steps=0)

    def sample(x):
        d2 = min((x[2 * j] - x[2 * a]) ** 2 + (x[2 * j + 1] - x[2 * a + 1]) ** 2 for a, j in PAIRS)
        if best['d2'] is None or d2 < best['d2']: best['d2'] = d2
    orig = R.bs_step

    def counted(x0, H, tol_):
        r, order = orig(x0, H, tol_)
        if r is not None: count['steps'] += 1; sample(r)
        return r, order
    R.bs_step = counted
    x0 = [mpf(v) for v in pc['start']]; sample(x0); T0 = time.time()
    end = R.flow(x0, mpf(pc['tau']), tol)
    res = dict(label=inp['label'], step=inp['taken_step'], piece=i, steps=count['steps'], smallest_pair_distance=float(sqrt(best['d2'])), end=[nstr(v, 45) for v in end], seconds=round(time.time() - T0, 1))
    json.dump(res, open(outf, 'x'), indent=1); print(json.dumps({k: v for k, v in res.items() if k != 'end'}))


def run(d, files, jobs):
    from concurrent.futures import ThreadPoolExecutor
    os.makedirs(d, exist_ok=True); todo = []
    for f in files:
        inp = json.load(open(f))
        for p in inp['pieces']:
            o = name(d, inp, p['piece'])
            if os.path.exists(o): sys.exit('exists, not overwriting: ' + o)
            todo.append((f, p['piece'], o))

    def go(t):
        r = subprocess.run([sys.executable, '-B', os.path.abspath(__file__), '--one', t[0], str(t[1]), t[2]], capture_output=True, text=True)
        print(os.path.basename(t[2]), r.stdout[-200:].strip(), r.stderr[-300:].strip(), flush=True)
    with ThreadPoolExecutor(jobs) as ex: list(ex.map(go, todo))


def summary(d, out, files):
    from mpmath import mp, mpf
    mp.dps = 50
    if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    rows = []; worst = {}
    for f in files:
        inp = json.load(open(f))
        for p in inp['pieces']:
            o = name(d, inp, p['piece'])
            if not os.path.exists(o): continue
            m = json.load(open(o)); ref = [mpf(v) for v in m['end']]
            row = dict(label=inp['label'], step=inp['taken_step'], piece=p['piece'], role=p['role'], smallest_pair_distance_50_digit=m['smallest_pair_distance'], smallest_sampled_pair_distance_ias15=p['ias_smallest_sampled_pair_distance'],
                       mp_steps=m['steps'], mp_seconds=m['seconds'])
            for k in ('ias', 'reg', 'dp45'):
                e = p[k].get('end')
                if e is None: row[k] = dict(end_state=None, why=p[k].get('why')); continue
                diffs = [abs(mpf(a) - b) for a, b in zip(e, ref)]
                row[k] = dict(D=float(max(a / max(mpf(1), abs(b)) for a, b in zip(diffs, ref))), largest_abs_difference=float(max(diffs)))
                if k == 'reg': row[k]['max_abs_matrix_entry'] = p['reg'].get('max_abs_matrix_entry')
                if k == 'dp45': row[k]['steps'] = p['dp45'].get('steps'); row[k]['seconds'] = p['dp45'].get('seconds')
                key = (k, p['role'])
                if row[k]['D'] > worst.get(key, (0, None))[0]: worst[key] = (row[k]['D'], '%s step %d piece %d' % (inp['label'], inp['taken_step'], p['piece']))
            rows.append(row)
    agg = {k + ' / ' + r: dict(largest_D=v[0], at=v[1]) for (k, r), v in sorted(worst.items())}
    what = ('the end states of pieces of the multiple shooting by IAS15 alone, reg.js and the Dormand-Prince integrator of the default route against the 50 digit unregularised flow, at the deepest witnessed step of t35 - (10), t44 - (34), t62 - (9), '
            't72 - (97) and the last stored step of t44 - (1588): every flagged piece, every piece replaced by the cross-check, and the two neighbours of each. D = largest over the 12 components of |a - mp| / max(1, |mp|); '
            'role: flagged (encounter piece, reg.js in the route), replaced (cross-check replaced IAS15 by reg.js), neighbour.')
    json.dump(dict(what=what, commands=['node tools/piece-ends.mjs LABEL STEP OUT.json', 'python tools/piece-mp.py run DIR OUT1.json ...', 'python tools/piece-mp.py summary DIR OUT.json IN1.json ...'], largest_D_by_integrator_and_role=agg, rows=rows), open(out, 'x'), indent=1)
    for key, v in agg.items(): print(key, '%.2e' % v['largest_D'], v['at'])


if len(sys.argv) > 4 and sys.argv[1] == '--one':
    one(sys.argv[2], int(sys.argv[3]), sys.argv[4])
elif len(sys.argv) >= 4 and sys.argv[1] == 'run':
    jobs = int(sys.argv[sys.argv.index('--jobs') + 1]) if '--jobs' in sys.argv else 3
    rest = [a for i, a in enumerate(sys.argv[3:], 3) if a != '--jobs' and sys.argv[i - 1] != '--jobs']
    run(sys.argv[2], rest, jobs)
elif len(sys.argv) >= 5 and sys.argv[1] == 'summary':
    summary(sys.argv[2], sys.argv[3], sys.argv[4:])
else:
    sys.exit('usage: python tools/piece-mp.py run DIR IN1.json ... [--jobs 3]  or  summary DIR OUT.json IN1.json ...')
