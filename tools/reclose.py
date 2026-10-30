# SPDX-License-Identifier: MIT
# re-closes a periodic orbit of the perpendicular start at a FIXED lam with the multiple precision flow of tools/refine-mp.py: Newton for (u1, u2, t) on the three closing equations of
# closePerp in src/perp.js. At the time t the state is collinear and the velocities of bodies 1 and 2 are perpendicular to the line (the line may have turned by a rotation, so the orbit
# repeats after 2t up to that rotation). With s the state at time t and d the unit vector along the longest of the three pair vectors:
#   r1 = ((x2 - x1)(y3 - y1) - (y2 - y1)(x3 - x1)) / (squared length of the longest pair),  r2 = v1 . d,  r3 = v2 . d      (bodies 1, 2, 3 are indices 0, 1, 2)
# The Jacobian is by forward differences in u1 and u2 (step 10^-(digits // 2)) and, for t, from the time derivative of the end state: (r(s + h f(s)) - r(s)) / h. Plain Newton step, at most 10 updates.
# python tools/reclose.py JOB.json OUT.json [--minutes 60] [--digits 50] [--tol 30] [--floor 1e-20]
#   JOB.json: {"id", "u1", "u2", "lam", "t", "ref": {"u1", "u2", "t"} or null}, the start values (strings or numbers) and, if given, the values to compare with. OUT.json must be new.
#   CONVERGED: the largest |r| is at most 1e-16 at an evaluation. SAME ORBIT (only with "ref"): the relative differences of u1, u2 and t from the ref values are at most 1e-9 (it was 1e-6 before; the re-closing of the 854 witnessed points changes u1, u2, t by at most 8.2e-11).
#   The output holds every iteration (residual, its three components, the relative step, the unknowns); a self-timer ends the job at the limit ("over limit").
import sys, os, json, time, threading, importlib.util
sys.dont_write_bytecode = True
from mpmath import mp, mpf, sqrt, matrix, lu_solve, nstr

here = os.path.dirname(os.path.abspath(__file__))


def option(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


jobfile, outfile = sys.argv[1], sys.argv[2]
limit, DIGITS, TOL, FLOOR = float(option('--minutes', 60)), int(option('--digits', 50)), int(option('--tol', 30)), option('--floor', '1e-20')
if os.path.exists(outfile): sys.exit('exists, not overwriting: ' + outfile)
spec = importlib.util.spec_from_file_location('refine_mp', os.path.join(here, 'refine-mp.py'))
R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
R.STEP_FLOOR = mpf(FLOOR)
mp.dps = DIGITS; TOLERANCE = mpf(10) ** (-TOL); H = mpf(10) ** (-(DIGITS // 2)); CONV = mpf(10) ** (-16); MAXUPD = 10
job = json.load(open(jobfile)); u1, u2, t = [mpf(str(job[k])) for k in ('u1', 'u2', 't')]; lam = mpf(str(job['lam'])); ref = job.get('ref')
rec = dict(iterations=[], flows=0); t0 = time.time()


def put(path, d):
    # a status file is written whole and then moved into place; Windows now and then refuses os.replace (another process has the file open), so it is tried a few times
    tmp = path + '.tmp'
    with open(tmp, 'w') as f: json.dump(d, f, indent=1)
    for k in range(10):
        try: os.replace(tmp, path); return
        except PermissionError: time.sleep(0.1 * (k + 1))
    os.replace(tmp, path)


def write(d):
    d.update(id=job['id'], lam=nstr(lam, 25), start=dict(u1=nstr(mpf(str(job['u1'])), 25), u2=nstr(mpf(str(job['u2'])), 25), t=nstr(mpf(str(job['t'])), 25)), digits=DIGITS, tol=TOL, floor=FLOOR, h=nstr(H, 3), limit_minutes=limit,
             flows=rec['flows'], iterations=rec['iterations'], elapsed_s=round(time.time() - t0, 1))
    put(outfile, d)


def timeout():
    write(dict(status='over limit', converged=False)); os._exit(3)


timer = threading.Timer(limit * 60, timeout); timer.daemon = True; timer.start()


def resid(s):
    big = mpf(0); dx = mpf(1); dy = mpf(0)
    for i in range(3):
        for j in range(i + 1, 3):
            rx = s[2 * j] - s[2 * i]; ry = s[2 * j + 1] - s[2 * i + 1]; l = rx * rx + ry * ry
            if l > big: big = l; n = sqrt(l); dx = rx / n; dy = ry / n
    return [((s[2] - s[0]) * (s[5] - s[1]) - (s[3] - s[1]) * (s[4] - s[0])) / big, s[6] * dx + s[7] * dy, s[8] * dx + s[9] * dy]


def F(a, b, tt):
    s = R.flow(R.start(a, b, lam), tt, TOLERANCE); rec['flows'] += 1
    return resid(s), s


try:
    converged = False; res = None
    for it in range(MAXUPD + 1):
        r0, s0 = F(u1, u2, t); res = max(abs(v) for v in r0)
        item = dict(it=it, residual=float(res), components=[float(v) for v in r0], u1=nstr(u1, 30), u2=nstr(u2, 30), t=nstr(t, 30))
        rec['iterations'].append(item)
        if res <= CONV: converged = True; break
        if it == MAXUPD: break
        J = matrix(3, 3)
        for c, (a, b) in enumerate([(u1 + H, u2), (u1, u2 + H)]):
            rq, _ = F(a, b, t)
            for k in range(3): J[k, c] = (rq[k] - r0[k]) / H
        f = R.deriv(s0); rt = resid([a + H * b for a, b in zip(s0, f)])
        for k in range(3): J[k, 2] = (rt[k] - r0[k]) / H
        d = lu_solve(J, matrix([-v for v in r0]))
        item['step_rel'] = [float(abs(d[0]) / abs(u1)), float(abs(d[1]) / abs(u2)), float(abs(d[2]) / abs(t))]
        u1, u2, t = u1 + d[0], u2 + d[1], t + d[2]
        write(dict(status='running', converged=False))
except Exception as e:
    write(dict(status='error', converged=False, error=str(e))); sys.exit(2)
out = dict(status='done', converged=converged, residual=float(res), u1=nstr(u1, 40), u2=nstr(u2, 40), t=nstr(t, 40), u1_float=float(u1), u2_float=float(u2), t_float=float(t), same_orbit=None)
if ref:
    d1, d2, dt = [abs(a - mpf(str(ref[k]))) / abs(mpf(str(ref[k]))) for a, k in ((u1, 'u1'), (u2, 'u2'), (t, 't'))]
    out.update(rel_diff_ref=dict(u1=float(d1), u2=float(d2), t=float(dt)), same_orbit=bool(converged and max(d1, d2, dt) <= mpf(10) ** (-9)))
write(out)
print('done', job['id'], 'converged', converged, 'residual', float(res), 'iterations', len(rec['iterations']), 'flows', rec['flows'], 'seconds', round(time.time() - t0, 1), flush=True)
