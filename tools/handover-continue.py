# SPDX-License-Identifier: MIT
# the 50 digit continuation of the hand-over (tools/handover-run.mjs): natural continuation in lam of a periodic orbit of the perpendicular start with the single shooting of tools/reclose.py, with a tangent
# first guess, a test of every step and a return test. From the closed orbit z at LAMZ and the closed orbit back at LAMBACK (a point of the same branch a little behind z) the tangent is
# T = (z - back) / (LAMZ - LAMBACK) for (u1, u2, t). b is the last accepted solution (z at the start), a the one before it. An attempt is at lam = b.lam + d. Guess g: as long as nothing is accepted
# z + (lam - LAMZ) T, afterwards the secant through a and b. The job is tools/reclose.py (50 digits, --tol 30, --floor 1e-20, --max-first R) with no reference. With predicted = the largest of
# |g - b| / |b| over u1, u2, t and miss = the largest of |solution - g| / |solution|, the attempt is ACCEPTED only if reclose.py is done and converged, t > 0 and miss <= RATIO x predicted. Otherwise the
# reason is recorded, d is divided by 10 and the attempt is made again from b; below --min-dlam the run stops. There is no step growth. If |lam| would reach 1 the run stops without a job. Reclose.py
# without any output stops the run.
# RETURN (after at least 2 accepted steps): the guess is the line through the first two accepted solutions evaluated at LAMZ, the job has z as its reference and no --max-first. PASS only if it is done,
# converged, t > 0 and the largest relative difference from z is at most 1e-9. HANDED OVER = at least 2 accepted steps and RETURN PASS. Only then the last orbit gets a w1b witness from its exact 40 digit start (tools/witness.py --exact-start).
# python tools/handover-continue.py LABEL Z.json LAMZ BACK.json LAMBACK OUTDIR [--steps 5] [--dlam 1e-5] [--min-dlam 1e-7] [--minutes 20] [--ratio 0.1] [--max-first 0.1] [--witness-minutes 30] [--no-witness]
#   Z.json, BACK.json: converged outputs of tools/reclose.py at LAMZ and LAMBACK (decimal strings); OUTDIR must be new. --steps is at least 2. --dlam is signed (the direction of lam).
#   OUTDIR gets LABEL_aNN.job.json / .out.json / .stdout for the attempts (NN = number of the attempt), LABEL_return.*, LABEL_w1.* and LABEL_continue.json (the result, rewritten after every attempt).
# exit status 0 if handed over and the witness (if it was run) wrote its output with exit status 0, 1 otherwise, 2 for a bad call.
import sys, os, json, time, subprocess
sys.dont_write_bytecode = True
from mpmath import mp, mpf, nstr

here = os.path.dirname(os.path.abspath(__file__))
mp.dps = 50
USAGE = 'usage: python tools/handover-continue.py LABEL Z.json LAMZ BACK.json LAMBACK OUTDIR [--steps 5] [--dlam 1e-5] [--min-dlam 1e-7] [--minutes 20] [--ratio 0.1] [--max-first 0.1] [--witness-minutes 30] [--no-witness]\n'
WITH_VALUE = ('--steps', '--dlam', '--min-dlam', '--minutes', '--ratio', '--max-first', '--witness-minutes')


def bad(msg):
    sys.stderr.write(msg + '\n' + USAGE); sys.exit(2)


pos, opt, i = [], {}, 1
while i < len(sys.argv):
    a = sys.argv[i]
    if a == '--no-witness': opt[a] = True
    elif a in WITH_VALUE:
        if i + 1 >= len(sys.argv): bad('no value for ' + a)
        opt[a] = sys.argv[i + 1]; i += 1
    elif a.startswith('--'): bad('unknown option ' + a)
    else: pos.append(a)
    i += 1
if len(pos) != 6: bad('six arguments are needed')
label, zfile, lamzs, backfile, lambacks, outdir = pos
try:
    steps, dlam, mindlam, ratio_max, maxfirst = int(opt.get('--steps', 5)), mpf(opt.get('--dlam', '1e-5')), mpf(opt.get('--min-dlam', '1e-7')), mpf(opt.get('--ratio', '0.1')), opt.get('--max-first', '0.1')
    minutes, wmin = str(float(opt.get('--minutes', 20))), str(float(opt.get('--witness-minutes', 30)))
    float(maxfirst); lamz, lamback = mpf(lamzs), mpf(lambacks)
except ValueError as e:
    bad('bad number: ' + str(e))
if steps < 2: bad('--steps must be at least 2')
if dlam == 0 or mindlam <= 0 or lamz == lamback: bad('--dlam and --min-dlam must be nonzero and the two lam values must differ')


def converged_output(f):
    try: o = json.load(open(f))
    except (OSError, ValueError): return None
    return o if o.get('converged') and all(k in o for k in ('u1', 'u2', 't')) else None


zo, bo = converged_output(zfile), converged_output(backfile)
if zo is None or bo is None: bad('Z.json and BACK.json must be converged outputs of tools/reclose.py')
if os.path.exists(outdir): bad('exists, not overwriting: ' + outdir)
os.makedirs(outdir)
zv, bv = [mpf(zo[k]) for k in ('u1', 'u2', 't')], [mpf(bo[k]) for k in ('u1', 'u2', 't')]
tang = [(x - y) / (lamz - lamback) for x, y in zip(zv, bv)]
sols = [dict(lam=lamz, v=zv, file=os.path.basename(zfile))]
res = dict(label=label, files=dict(z=os.path.basename(zfile), back=os.path.basename(backfile)), lam0=lamzs, lamback=lambacks, tangent=[nstr(x, 30) for x in tang], dlam_requested=str(dlam), dlam_last=None,
           steps=[], attempts=[], **{'return': None}, witness=None, stopped=None, handed_over=False)


def put(path, d):
    # a status file is written whole and then moved into place; Windows now and then refuses os.replace (another process has the file open), so it is tried a few times
    tmp = path + '.tmp'
    with open(tmp, 'w') as f: json.dump(d, f, indent=1)
    for k in range(10):
        try: os.replace(tmp, path); return
        except PermissionError: time.sleep(0.1 * (k + 1))
    os.replace(tmp, path)


dump = lambda: put(os.path.join(outdir, label + '_continue.json'), res)


def rel(a, b):
    return [abs(x - y) / abs(y) for x, y in zip(a, b)]


def run(cmd, tag):
    t0 = time.time()
    p = subprocess.run([sys.executable, '-B'] + cmd, capture_output=True, text=True)
    open(os.path.join(outdir, tag + '.stdout'), 'w').write(p.stdout + p.stderr)
    return time.time() - t0, p.returncode


def reclose(tag, g, lam, ref, first_limit):
    # one job of tools/reclose.py; returns (output or {}, seconds, exit status, name of the output file)
    job = dict(id=tag, u1=nstr(g[0], 40), u2=nstr(g[1], 40), lam=nstr(lam, 40), t=nstr(g[2], 40), ref=ref)
    jf, of = os.path.join(outdir, tag + '.job.json'), os.path.join(outdir, tag + '.out.json')
    json.dump(job, open(jf, 'x'))
    cmd = [os.path.join(here, 'reclose.py'), jf, of, '--minutes', minutes, '--digits', '50', '--tol', '30', '--floor', '1e-20']
    if first_limit is not None: cmd += ['--max-first', first_limit]
    sec, code = run(cmd, tag)
    return (json.load(open(of)) if os.path.exists(of) else {}), sec, code, os.path.basename(of)


d, n = dlam, 0
while len(sols) - 1 < steps:
    b = sols[-1]; lam = b['lam'] + d
    if abs(lam) >= 1:
        res['stopped'] = 'attempt %d: |lam| would reach 1 (lam %s), no job' % (n + 1, nstr(lam, 25)); break
    if len(sols) == 1: g = [x + (lam - lamz) * y for x, y in zip(zv, tang)]; how = 'tangent through z and back'
    else:
        a = sols[-2]; r = (lam - b['lam']) / (b['lam'] - a['lam'])
        g = [vb + r * (vb - va) for va, vb in zip(a['v'], b['v'])]; how = 'secant through the two previous solutions'
    n += 1; tag = '%s_a%02d' % (label, n)
    res['dlam_last'] = str(d)
    o, sec, code, of = reclose(tag, g, lam, None, maxfirst)
    predicted = max(rel(g, b['v']))
    att = dict(tag=tag, lam=nstr(lam, 25), d=str(d), status=o.get('status'), converged=bool(o.get('converged')), t=o.get('t'), first_residual=o['iterations'][0]['residual'] if o.get('iterations') else None,
               predicted=float(predicted), miss=None, ratio=None, accepted=False, reason=None, seconds=round(sec, 1), exit=code)
    res['attempts'].append(att)
    if not o:
        att['reason'] = 'reclose.py produced no output (exit %d)' % code
        res['stopped'] = 'attempt %d: %s' % (n, att['reason']); dump(); break
    v = None
    if o.get('status') == 'done' and all(k in o for k in ('u1', 'u2', 't')):
        v = [mpf(o[x]) for x in ('u1', 'u2', 't')]
        missv = max(rel(g, v)); att['miss'] = float(missv); att['ratio'] = float(missv / predicted) if predicted > 0 else None
    if o.get('status') != 'done': att['reason'] = 'status %s (exit %d)' % (o.get('status'), code)
    elif not o.get('converged'): att['reason'] = 'not converged (residual %s after %d updates)' % (o.get('residual'), len(o.get('iterations', [])) - 1)
    elif not v[2] > 0: att['reason'] = 't not positive'
    elif missv > ratio_max * predicted: att['reason'] = 'miss %.3g above %s x predicted %.3g' % (att['miss'], nstr(ratio_max, 5), att['predicted'])
    else:
        att['accepted'] = True
        sols.append(dict(lam=lam, v=v, file=of))
        res['steps'].append(dict(step=len(sols) - 1, lam=nstr(lam, 25), file=of, guess_from=how, converged=True, updates=len(o['iterations']) - 1, first_residual=att['first_residual'], residual=o['residual'],
                                 seconds=att['seconds'], predicted=att['predicted'], miss=att['miss'], ratio=att['ratio']))
        print(label, 'attempt', n, 'accepted, step', len(sols) - 1, 'lam', nstr(lam, 20), 'seconds', att['seconds'], flush=True)
        dump(); continue
    print(label, 'attempt', n, 'rejected:', att['reason'], flush=True)
    d = d / 10
    if abs(d) < mindlam * (1 - mpf('1e-9')):
        res['stopped'] = 'dlam %s is below --min-dlam %s after attempt %d (%s)' % (nstr(d, 5), nstr(mindlam, 5), n, att['reason']); dump(); break
    dump()
if len(sols) >= 3:
    s1, s2 = sols[1], sols[2]; r = (lamz - s1['lam']) / (s2['lam'] - s1['lam'])
    g = [x + r * (y - x) for x, y in zip(s1['v'], s2['v'])]
    o, sec, code, of = reclose(label + '_return', g, lamz, dict(u1=zo['u1'], u2=zo['u2'], t=zo['t']), None)
    dif = o.get('rel_diff_ref') or {}
    mx = max(dif.values()) if dif else None
    ok = bool(o.get('status') == 'done' and o.get('converged') and mpf(o['t']) > 0 and mx is not None and mx <= 1e-9)
    res['return'] = {'guess_from': 'line through the first two accepted solutions at LAMZ', 'file': of, 'status': o.get('status'), 'converged': bool(o.get('converged')), 't': o.get('t'), 'rel_diff_ref': dif or None,
                     'max_rel_diff_ref': mx, 'pass': ok, 'seconds': round(sec, 1), 'exit': code}
    res['handed_over'] = ok
    print(label, 'return', 'PASS' if ok else 'FAIL', 'max rel diff', mx, flush=True)
dump()
wcode = 0
if res['handed_over'] and '--no-witness' not in opt:
    last = sols[-1]
    wj = dict(id=label + '_w1', u1=nstr(last['v'][0], 40), u2=nstr(last['v'][1], 40), lam=nstr(last['lam'], 40), t=nstr(last['v'][2], 40))
    jf, of = os.path.join(outdir, label + '_w1.job.json'), os.path.join(outdir, label + '_w1.out.json')
    json.dump(wj, open(jf, 'x'))
    sec, wcode = run([os.path.join(here, 'witness.py'), jf, of, '--preset', 'w1b', '--exact-start', '--minutes', str(opt.get('--witness-minutes', 30))], label + '_w1')
    res['witness'] = dict(file=os.path.basename(of), seconds=round(sec, 1), exists=os.path.exists(of), exit=wcode)
    dump()
print(label, 'done', len(res['steps']), 'steps, handed over' if res['handed_over'] else 'steps, not handed over', flush=True)
# exit status 1 if not handed over or the witness failed (the JSON says which)
if not res['handed_over'] or (res['witness'] is not None and (wcode != 0 or not res['witness']['exists'])): sys.exit(1)
