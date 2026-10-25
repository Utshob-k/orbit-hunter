# the multiple precision flow of tools/refine-mp.py (Gragg-Bulirsch-Stoer, three unit masses built in) on a Kepler pair of the equal-mass problem, against the exact Kepler flow of tools/kepler-ref.py.
# The third body of mass 1 is at rest at (R, 0), R = 1e9, so that the flow can run it; the pair's centre is at the origin at rest, the start is the apocentre of a = 1, e = 1 - q, the interval is
# one nominal period 2 pi / sqrt(2). Output: the 12 end numbers, the 4 relative numbers of the pair, the exact ones, the errors |difference| / max(1, |exact|), the number of steps, the
# smallest accepted step, the rejected tries and the seconds. A collapse of the step size is recorded as such.
# python tools/kepler-check.py q out.json [--digits 50] [--tol 30] [--floor 1e-20] [--third 1e9] [--limit-minutes 60]
#   digits: working precision; tol: the flow tolerance is 10^-tol; floor: the step size below which the flow gives up (refine-mp.py has 1e-9); the output file must be new.
import sys, os, json, time, threading, importlib.util
sys.dont_write_bytecode = True
from mpmath import mp, mpf, nstr

here = os.path.dirname(os.path.abspath(__file__))


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), os.path.join(here, name + '.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def option(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    q, outfile = float(sys.argv[1]), sys.argv[2]
    digits, tolexp, floor = int(option('--digits', 50)), int(option('--tol', 30)), option('--floor', '1e-20')
    third, limit = float(option('--third', 1e9)), float(option('--limit-minutes', 60))
    if os.path.exists(outfile): sys.exit('exists, not overwriting: ' + outfile)
    R, K = load('refine-mp'), load('kepler-ref')
    mp.dps = digits; tol = mpf(10) ** (-tolexp); R.STEP_FLOOR = mpf(floor)
    t0 = time.time(); state = dict(t=mpf(0), steps=0, rejected=0, minH=None)
    orig_step = R.bs_step

    def counted(x0, H, tol_):
        r, order = orig_step(x0, H, tol_)
        if r is None: state['rejected'] += 1
        else:
            state['t'] += H; state['steps'] += 1
            state['minH'] = H if state['minH'] is None or H < state['minH'] else state['minH']
        return r, order
    R.bs_step = counted

    def write(d):
        d.update(q=q, third=third, dps=digits, tolexp=tolexp, floor=floor, limit_minutes=limit)
        tmp = outfile + '.tmp'; json.dump(d, open(tmp, 'w'), indent=1); os.replace(tmp, outfile)

    def timeout():
        write(dict(status='over limit', elapsed_s=round(time.time() - t0), t_reached=float(state['t']), steps=state['steps'])); os._exit(3)
    timer = threading.Timer(limit * 60, timeout); timer.daemon = True; timer.start()
    r0, v0 = K.setup_rel(q); tau = K.tau_period()
    x0 = [-r0[0] / 2, -r0[1] / 2, r0[0] / 2, r0[1] / 2, third, 0.0, -v0[0] / 2, -v0[1] / 2, v0[0] / 2, v0[1] / 2, 0.0, 0.0]
    try:
        xe = R.flow([mpf(v) for v in x0], mpf(tau), tol)
    except RuntimeError as ex:
        write(dict(status='error', error=str(ex), elapsed_s=round(time.time() - t0), t_reached=float(state['t']), steps=state['steps'], rejected=state['rejected'],
                   min_accepted_step=(float(state['minH']) if state['minH'] is not None else None)))
        sys.exit(2)
    sec = time.time() - t0
    rel = [xe[2] - xe[0], xe[3] - xe[1], xe[8] - xe[6], xe[9] - xe[7]]
    rr, vv, el = K.prop(r0, v0, tau)
    mp.dps = digits
    ref = [rr[0], rr[1], vv[0], vv[1]]
    errs = [abs(a - b) / max(mpf(1), abs(b)) for a, b in zip(rel, ref)]
    write(dict(status='done', x_end=[nstr(v, digits) for v in xe], rel_end=[nstr(v, digits) for v in rel], exact_end=[nstr(v, 45) for v in ref], errors=[nstr(e, 6) for e in errs], error_max=nstr(max(errs), 6),
               steps=state['steps'], rejected=state['rejected'], min_accepted_step=float(state['minH']), seconds=round(sec, 1), e=nstr(el['e'], 20), a=nstr(el['a'], 20)))
    print('done q', q, 'error_max', nstr(max(errs), 4), 'steps', state['steps'], 'min step %.3g' % float(state['minH']), 'seconds', round(sec, 1), flush=True)


if __name__ == '__main__':
    main()
