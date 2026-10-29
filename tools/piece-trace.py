# SPDX-License-Identifier: MIT
# REBOUND's TRACE integrator (Lu, Hernandez and Rein 2024) on the pieces of tools/piece-ends.mjs, against the 50 digit end states of tools/piece-mp.py. Same inputs as `tools/piece-mp.py summary`: the piece-ends
# outputs (start state and tau of every piece) and the folder of the 50 digit end states; the 50 digit flow is not run again. A REBOUND simulation with G = 1, three masses 1 and the 12 start numbers of the piece,
# sim.integrator = 'trace', sim.dt = tau / N, sim.integrate(tau, exact_finish_time=1). Three settings, nothing else is tuned:
#   a  the defaults of REBOUND 5.2.2 (peri_mode FULL_BS, r_crit_hill 3.0, peri_crit_eta 1.0), N = 100
#   b  the defaults, N = 1000
#   c  N = 1000 with sim.integrator.peri_mode = 'FULL_IAS15'
# Per piece and setting: D = the largest over the 12 components of |a - mp| / max(1, |mp|) (the measure of piece-mp.py), the largest absolute difference, the wall time, sim.t - tau and whether the run raised an error.
# TRACE treats particle 0 as the central body of a hierarchy; three equal masses without a dominant body are outside its design. No matrix is compared (REBOUND's TRACE gives the end state only).
#   python tools/piece-trace.py MPDIR OUT.json IN1.json [IN2.json ...] [--compare piece-check-mp.json]     OUT.json must be new
#   MPDIR: the folder of the 50 digit end states (files <label>_<step>_p<piece>.json written by `python tools/piece-mp.py run`); INn.json: the outputs of `node tools/piece-ends.mjs`.
#   --compare: data/deep/extra/piece-check-mp.json, whose largest_D_by_integrator_and_role (IAS15 alone, reg.js, Dormand-Prince) is copied next to the TRACE values.
import sys, os, json, time, statistics
sys.dont_write_bytecode = True
import rebound
from mpmath import mp, mpf
mp.dps = 50

SETTINGS = {'a': dict(N=100, peri_mode=None, text='defaults, N = 100'), 'b': dict(N=1000, peri_mode=None, text='defaults, N = 1000'), 'c': dict(N=1000, peri_mode='FULL_IAS15', text="N = 1000, peri_mode FULL_IAS15")}


def trace_end(start, tau, N, peri_mode):
    sim = rebound.Simulation(); sim.G = 1.0
    for i in range(3): sim.add(m=1.0, x=start[2 * i], y=start[2 * i + 1], vx=start[6 + 2 * i], vy=start[7 + 2 * i])
    sim.integrator = 'trace'
    if peri_mode: sim.integrator.peri_mode = peri_mode
    used = dict(peri_mode=str(sim.integrator.peri_mode), r_crit_hill=sim.integrator.r_crit_hill, peri_crit_eta=sim.integrator.peri_crit_eta)
    sim.dt = tau / N
    t0 = time.time()
    try:
        sim.integrate(tau, exact_finish_time=1)
    except Exception as e:
        return None, dict(error=repr(e)[:200], seconds=time.time() - t0), used
    P = sim.particles
    end = [P[0].x, P[0].y, P[1].x, P[1].y, P[2].x, P[2].y, P[0].vx, P[0].vy, P[1].vx, P[1].vy, P[2].vx, P[2].vy]
    return end, dict(error=None, seconds=time.time() - t0, sim_t_minus_tau=sim.t - tau), used


def main():
    a = sys.argv[1:]
    if len(a) < 3: sys.exit('usage: python tools/piece-trace.py MPDIR OUT.json IN1.json [IN2.json ...] [--compare piece-check-mp.json]')
    cmp_file = a[a.index('--compare') + 1] if '--compare' in a else None
    rest = [x for i, x in enumerate(a) if x != '--compare' and (i == 0 or a[i - 1] != '--compare')]
    mpdir, out, ins = rest[0], rest[1], rest[2:]
    if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    rows = []; used = {}; worst = {}
    for f in ins:
        inp = json.load(open(f))
        for p in inp['pieces']:
            m = json.load(open('%s/%s_%d_p%02d.json' % (mpdir, inp['label'], inp['taken_step'], p['piece'])))
            ref = [mpf(v) for v in m['end']]
            row = dict(label=inp['label'], step=inp['taken_step'], piece=p['piece'], role=p['role'], smallest_pair_distance_50_digit=m['smallest_pair_distance'])
            for k, s in SETTINGS.items():
                end, info, u = trace_end(p['start'], p['tau'], s['N'], s['peri_mode']); used[k] = dict(u, N=s['N'], exact_finish_time=1, text=s['text'])
                r = dict(seconds=round(info['seconds'], 4), error=info['error'])
                if end is not None:
                    diffs = [abs(mpf(x) - y) for x, y in zip(end, ref)]
                    r.update(D=float(max(d / max(mpf(1), abs(y)) for d, y in zip(diffs, ref))), largest_abs_difference=float(max(diffs)), sim_t_minus_tau=info['sim_t_minus_tau'])
                    if r['D'] > worst.get((k, p['role']), (0, None))[0]: worst[(k, p['role'])] = (r['D'], '%s step %d piece %d' % (inp['label'], inp['taken_step'], p['piece']))
                row[k] = r
            rows.append(row)
    agg = {'%s / %s' % (k, role): dict(largest_D=v[0], at=v[1]) for (k, role), v in sorted(worst.items())}
    times = {k: dict(median_seconds=statistics.median([r[k]['seconds'] for r in rows]), largest_seconds=max(r[k]['seconds'] for r in rows), total_seconds=sum(r[k]['seconds'] for r in rows), errors=sum(1 for r in rows if r[k]['error'])) for k in SETTINGS}
    what = ("REBOUND's TRACE integrator (REBOUND %s) on the %d pieces of piece-check-mp.json (the pieces of the multiple shooting at the deepest witnessed step of t35 -, t44 -, t62 -, t72 - and the last stored step of t44 -: flagged, cross-checked, neighbours), "
            "against the 50 digit end states of piece-mp.py. G = 1, masses 1, the 12 start numbers of the piece, integrator 'trace', dt = tau / N, integrate(tau, exact_finish_time=1). Settings: a = defaults, N = 100; b = defaults, N = 1000; "
            "c = N = 1000 with peri_mode FULL_IAS15 (the values in use are in settings). D = the largest over the 12 components of |a - mp| / max(1, |mp|), as in piece-check-mp.json. "
            "TRACE treats particle 0 as the central body of a hierarchy; three equal masses without a dominant body are outside its design, so this is a test of TRACE outside its intended use, not of its quality in it. "
            "No matrix is compared: TRACE gives the end state only, the corrector needs the derivative." % (rebound.__version__, len(rows)))
    res = dict(what=what, commands=['python tools/piece-trace.py MPDIR OUT.json PIECE_ENDS1.json ... --compare data/deep/extra/piece-check-mp.json'], rebound_version=rebound.__version__, settings=used,
               largest_D_by_setting_and_role=agg, time=times)
    if cmp_file: res['largest_D_of_the_other_integrators_by_role_from_piece-check-mp.json'] = json.load(open(cmp_file))['largest_D_by_integrator_and_role']
    res['rows'] = rows
    json.dump(res, open(out, 'x'), indent=1)
    for k, v in agg.items(): print(k, '%.2e' % v['largest_D'], v['at'])
    for k, v in times.items(): print('setting', k, v)


main()
