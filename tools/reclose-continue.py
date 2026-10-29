# natural continuation in lam of a periodic orbit of the perpendicular start with the 50 digit single shooting of tools/reclose.py: from a closed orbit (u1, u2, t) at lam0 the parameter is stepped by
# dlam, STEPS times, every step closed again by tools/reclose.py (50 digits, --tol 30, --floor 1e-20) from a guess. Guess of the first step: the start orbit itself; of the later steps: the secant through the
# two previous solutions (linear extrapolation in lam; the second step uses the start orbit and the first solution). Per step: converged, updates, residual, the change of (u1, u2, t) from the previous
# solution and its second difference (the smoothness along the branch). After the last step the last orbit gets a w1 witness (tools/witness.py).
# python tools/reclose-continue.py LABEL START.json LAM0 OUTDIR [--steps 10] [--dlam -1e-5] [--minutes 60] [--witness-minutes 30] [--compare-first F.json] [--compare-last F.json] [--no-witness]
#   START.json: an output of tools/reclose.py (u1, u2, t as 40 digit strings) at LAM0 (a decimal string). OUTDIR must be new: it gets LABEL_sNN.job.json / .out.json for the steps, LABEL_w1.job.json / .out.json
#   and LABEL_continue.json (the result, rewritten after every step). --compare-first: an output of tools/reclose.py at lam0 + dlam (single jump from lam0 alone) to compare the first step with; --compare-last: the same
#   at lam0 + STEPS * dlam to compare the last step with (relative differences of u1, u2, t).
import sys, os, json, time, subprocess
sys.dont_write_bytecode = True
from mpmath import mp, mpf, nstr

here = os.path.dirname(os.path.abspath(__file__))
mp.dps = 50


def option(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


label, startfile, lam0s, outdir = sys.argv[1:5]
steps, dlam, minutes, wmin = int(option('--steps', 10)), mpf(option('--dlam', '-1e-5')), option('--minutes', '60'), option('--witness-minutes', '30')
if os.path.exists(outdir): sys.exit('exists, not overwriting: ' + outdir)
os.makedirs(outdir)
st = json.load(open(startfile))
if not st.get('converged'): sys.exit('the start orbit is not converged')
sol = [dict(lam=mpf(lam0s), v=[mpf(st[k]) for k in ('u1', 'u2', 't')])]
res = dict(label=label, start_file=os.path.basename(startfile), lam0=lam0s, dlam=str(dlam), steps=[], witness=None)
dump = lambda: (lambda tmp: (json.dump(res, open(tmp, 'w'), indent=1), os.replace(tmp, os.path.join(outdir, label + '_continue.json'))))(os.path.join(outdir, label + '_continue.json.tmp'))


def rel(a, b):
    return [float(abs(x - y) / abs(y)) for x, y in zip(a, b)]


def run(cmd, tag):
    t0 = time.time()
    p = subprocess.run([sys.executable, '-B'] + cmd, capture_output=True, text=True)
    open(os.path.join(outdir, tag + '.stdout'), 'w').write(p.stdout + p.stderr)
    return time.time() - t0


for k in range(1, steps + 1):
    lam = mpf(lam0s) + k * dlam
    if k == 1: g = sol[0]['v']; how = 'start orbit'
    else:
        a, b = sol[-2], sol[-1]; r = (lam - b['lam']) / (b['lam'] - a['lam'])
        g = [vb + r * (vb - va) for va, vb in zip(a['v'], b['v'])]; how = 'secant through the two previous solutions'
    tag = '%s_s%02d' % (label, k)
    job = dict(id=tag, u1=nstr(g[0], 40), u2=nstr(g[1], 40), lam=nstr(lam, 40), t=nstr(g[2], 40), ref=None)
    jf, of = os.path.join(outdir, tag + '.job.json'), os.path.join(outdir, tag + '.out.json')
    json.dump(job, open(jf, 'x'))
    sec = run([os.path.join(here, 'reclose.py'), jf, of, '--minutes', minutes, '--digits', '50', '--tol', '30', '--floor', '1e-20'], tag)
    o = json.load(open(of)) if os.path.exists(of) else {}
    row = dict(step=k, lam=nstr(lam, 25), guess_from=how, converged=bool(o.get('converged')), status=o.get('status'), updates=len(o.get('iterations', [])) - 1 if o.get('converged') else None,
               first_residual=o['iterations'][0]['residual'] if o.get('iterations') else None, residual=o.get('residual'), seconds=round(sec, 1), guess_to_solution_rel=None)
    if not o.get('converged'):
        res['steps'].append(row); res['stopped'] = 'step %d did not converge' % k; dump(); break
    v = [mpf(o[x]) for x in ('u1', 'u2', 't')]
    row['guess_to_solution_rel'] = rel(g, v)
    prev = sol[-1]
    row['change_abs'] = [float(x - y) for x, y in zip(v, prev['v'])]
    row['change_rel'] = rel(v, prev['v'])
    if len(sol) >= 2:
        pp = sol[-2]
        d2 = [x - 2 * y + z for x, y, z in zip(v, prev['v'], pp['v'])]
        row['second_difference_abs'] = [float(x) for x in d2]
        d1 = [x - y for x, y in zip(v, prev['v'])]
        row['second_over_first'] = [float(abs(a) / abs(b)) if b != 0 else None for a, b in zip(d2, d1)]
    sol.append(dict(lam=lam, v=v))
    if k == 1 and '--compare-first' in sys.argv:
        c = json.load(open(option('--compare-first', None))); row['compare_first_single_jump_rel'] = rel(v, [mpf(c[x]) for x in ('u1', 'u2', 't')])
    if k == steps and '--compare-last' in sys.argv:
        c = json.load(open(option('--compare-last', None))); row['compare_last_single_jump_rel'] = rel(v, [mpf(c[x]) for x in ('u1', 'u2', 't')])
    res['steps'].append(row); dump()
    print(label, 'step', k, 'converged', row['converged'], 'updates', row['updates'], 'residual', row['residual'], 'seconds', row['seconds'], flush=True)
if len(sol) == steps + 1 and '--no-witness' not in sys.argv:
    last = sol[-1]
    wj = dict(id=label + '_w1', u1=float(last['v'][0]), u2=float(last['v'][1]), lam=float(last['lam']), t=float(last['v'][2]))
    jf, of = os.path.join(outdir, label + '_w1.job.json'), os.path.join(outdir, label + '_w1.out.json')
    json.dump(wj, open(jf, 'x'))
    sec = run([os.path.join(here, 'witness.py'), jf, of, '--preset', 'w1', '--minutes', wmin], label + '_w1')
    res['witness'] = dict(file=os.path.basename(of), seconds=round(sec, 1), exists=os.path.exists(of))
    dump()
print(label, 'done', len(res['steps']), 'steps', flush=True)
