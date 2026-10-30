# SPDX-License-Identifier: MIT
# A diagnostic of REBOUND's default first step, not a test of PeriCont: test/ias-first-step.test.js repeats the piece18 check, it is not in the test:ias script (it fails if REBOUND changes its default). The first step of IAS15 (src/ias/ias-bridge.py), two checks against the end state of reg.js. error = largest over the 12 components of |IAS15 - reg.js| / max(1, |reg.js|).
#   python tools/first-step-check.py piece18 OUT.json
#       IAS15 over piece 18 of the kept points k10, k11, k12 of t35 - (data/deep/extra/piece18-states.json) for adaptive_mode 0, 1, 2, 3 and the first steps REBOUND's default 0.001, 1e-4 and 1e-6, and
#       'timescale' (sim.dt = 0.01 * the smallest d / |v_rel| of the three pairs, the setting of src/settings.js); the reg.js end states are those stored in the data file. A few seconds.
#   python tools/first-step-check.py scan ITERATES.json OUT.json
#       the pieces of the 320 stored iterates of the piece scan (the file is in the raw deposit: iterates/piece-scan-iterates.json; per iterate the 24 piece starts, tau, the IAS15 end states of the stored run
#       and the end state of reg.js alone, 'c1'): IAS15 with adaptive_mode 2 and the first step 'legacy' (it has to give the stored end states again) and 'timescale', against the reg.js end state c1. The scan of
#       data/deep/extra/piece-scan.json found reg.js within 1.74e-14 of a 40 digit flow on every piece, so this error is that of IAS15 to within 2e-14. The pair minimum is the smallest pair distance sampled by the legacy run, the quantity the cross-check of the bridge tests against 0.05. Pieces that the stored run flagged as encounter pieces
#       (a pair below 1e-3: reg.js replaces IAS15 there) are left out of the counts. About 15 seconds.
import sys, os, json, time, importlib.util
sys.dont_write_bytecode = True

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
sys.path.insert(0, os.path.join(root, 'src', 'ias'))
spec = importlib.util.spec_from_file_location('ias_bridge', os.path.join(root, 'src', 'ias', 'ias-bridge.py')); B = importlib.util.module_from_spec(spec); spec.loader.exec_module(B)


def err(a, b): return max(abs(x - y) / max(1.0, abs(y)) for x, y in zip(a, b))


def piece18(out):
    d = json.load(open(os.path.join(root, 'data', 'deep', 'extra', 'piece18-states.json')))
    rows = []
    import rebound
    for pt in d['points']:
        st, tau, ref = pt['state'], pt['tau'], pt['reg_end']
        for mode in (0, 1, 2, 3):
            for first in ('default', 1e-4, 1e-6, 'timescale'):
                if first == 'timescale': e, k, a = B.piece(st, tau, mode, 390.0, 'timescale', 0.01)
                else:
                    sim = rebound.Simulation(); sim.G = 1.0; sim.integrator = 'ias15'; sim.integrator.adaptive_mode = mode
                    for i in range(3): sim.add(m=1.0, x=st[2 * i], y=st[2 * i + 1], vx=st[6 + 2 * i], vy=st[7 + 2 * i])
                    if first != 'default': sim.dt = first
                    sim.integrate(tau); p = sim.particles
                    e = [p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y, p[0].vx, p[0].vy, p[1].vx, p[1].vy, p[2].vx, p[2].vy]; k = int(sim.steps_done)
                rows.append(dict(point=pt['point'], adaptive_mode=mode, first_step=first if first != 'default' else 'default (0.001)', ias15_steps=k, error=err(e, ref)))
                print(rows[-1], flush=True)
    json.dump(dict(what='IAS15 over piece 18 of k10, k11, k12 against reg.js, by adaptive_mode and first step (tools/first-step-check.py piece18)', rows=rows), open(out, 'x'), indent=1)


def scan(its_file, out):
    its = json.load(open(its_file)); rows = []; t0 = time.time()
    for rec in its:
        for i, st in enumerate(rec['starts']):
            c1 = rec['c1'][i]
            if rec['enc'][i] or 'end' not in c1: continue
            r = {}; pm = None
            for first in ('legacy', 'timescale'):
                e, k, a = B.piece(st, rec['tau'], 2, 390.0, first, 0.01)
                if pm is None: pm = min(a['pair_minima'])
                r[first] = dict(err=err(e, c1['end']), steps=k, same_as_stored=(e == rec['ends'][i]) if first == 'legacy' else None)
            rows.append(dict(rec=rec['id'], piece=i, pair_minimum=pm, **r))
    def summ(sel, key):
        v = [x[key]['err'] for x in sel]
        return dict(pieces=len(v), error_ge_1e12=sum(1 for x in v if x >= 1e-12), error_ge_1e9=sum(1 for x in v if x >= 1e-9), largest_error=max(v), ias15_steps=sum(x[key]['steps'] for x in sel))
    near = [x for x in rows if x['pair_minimum'] < 0.05]
    res = dict(what='IAS15 (adaptive_mode 2) on the unflagged pieces of the 320 stored iterates of the piece scan against reg.js, first step legacy and timescale (tools/first-step-check.py scan)', seconds=time.time() - t0, iterates=len(its),
               unflagged_pieces=len(rows), stored_ends_reproduced_by_legacy=sum(1 for x in rows if x['legacy']['same_as_stored']), legacy=summ(rows, 'legacy'), timescale=summ(rows, 'timescale'),
               pair_minimum_below_0_05_legacy=summ(near, 'legacy'), pair_minimum_below_0_05_timescale=summ(near, 'timescale'),
               pieces_with_error_ge_1e12=[dict(rec=x['rec'], piece=x['piece'], legacy=x['legacy']['err'], timescale=x['timescale']['err']) for x in rows if max(x['legacy']['err'], x['timescale']['err']) >= 1e-12])
    json.dump(res, open(out, 'x'), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != 'pieces_with_error_ge_1e12'}, indent=1)); print('pieces with an error of 1e-12 or more in either setting:', len(res['pieces_with_error_ge_1e12']))


if len(sys.argv) == 3 and sys.argv[1] == 'piece18' and not os.path.exists(sys.argv[2]): piece18(sys.argv[2])
elif len(sys.argv) == 4 and sys.argv[1] == 'scan' and not os.path.exists(sys.argv[3]): scan(sys.argv[2], sys.argv[3])
else: sys.exit('usage: python tools/first-step-check.py piece18 OUT.json | scan ITERATES.json OUT.json (OUT.json must be new)')
