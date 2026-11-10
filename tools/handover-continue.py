# SPDX-License-Identifier: MIT
# the 50 digit continuation of the hand-over (tools/handover-run.mjs): natural continuation in lam of a periodic orbit of the perpendicular start with the single shooting of tools/reclose.py, with a tangent
# first guess, a test of every step and a return test. From the closed orbit z at LAMZ and the closed orbit back at LAMBACK (a point of the same branch a little behind z) the tangent is
# T = (z - back) / (LAMZ - LAMBACK) for (u1, u2, t). b is the last accepted solution (z at the start), a the one before it. An attempt is at lam = b.lam + d. Guess g: as long as nothing is accepted
# z + (lam - LAMZ) T, afterwards the secant through a and b. The job is tools/reclose.py (50 digits, --tol 30, --floor 1e-20, --max-first R) with no reference. With predicted = the largest of
# |g - b| / |b| over u1, u2, t and miss = the largest of |solution - g| / |solution|, the attempt is ACCEPTED only if reclose.py is done and converged, t > 0 and miss <= RATIO x predicted. Otherwise the
# reason is recorded, d is divided by 10 and the attempt is made again from b; below --min-dlam the run stops. There is no step growth. If |lam| would reach 1 the run stops without a job. Reclose.py
# without any output stops the run, and so does an attempt output that is not valid JSON (or not a JSON object): stopped 'attempt N: output of LABEL_aNN not valid JSON (exit E)', the attempt
# recorded with that reason (before, such an attempt was rejected and the run went on with d / 10). An exact zero component of b (or of the solution) is left out of the
# per component maximum (the attempt gets measure_note 'zero component left out').
# RETURN (after at least 2 accepted steps): the guess is the line through the first two accepted solutions evaluated at LAMZ, the job has z as its reference and no --max-first. PASS only if it is done,
# converged, t > 0 and the largest relative difference from z is at most 1e-9. HANDED OVER = at least 2 accepted steps and RETURN PASS. Only then the last orbit gets a w1b witness from its exact 40 digit start (tools/witness.py --exact-start).
# python tools/handover-continue.py LABEL Z.json LAMZ BACK.json LAMBACK OUTDIR [--steps 5] [--dlam 1e-5] [--min-dlam 1e-7] [--minutes 20] [--ratio 0.1] [--max-first 0.1] [--witness-minutes 30] [--no-witness]
#     [--conv C] [--floor-try] [--miss-norm] [--return-last] [--miss-return] [--edge-shrink] [--safe]
#   Z.json, BACK.json: converged outputs of tools/reclose.py at LAMZ and LAMBACK (decimal strings); OUTDIR must be new. --steps is at least 2. --dlam is signed (the direction of lam).
#   A Z.json or BACK.json that is not a JSON object, or whose u1, u2 or t is not a number, is a bad call (exit 2, no OUTDIR made).
#   If Z.json (BACK.json) has a lam field, LAMZ (LAMBACK) must agree with it to a relative 1e-24 (absolute if it is 0), otherwise exit 2; a file without lam is taken as it is (lam_check says so).
#   OUTDIR gets LABEL_aNN.job.json / .out.json / .stdout for the attempts (NN = number of the attempt), LABEL_return.*, LABEL_w1.* and LABEL_continue.json (the result, rewritten after every attempt),
#   with --return-last also LABEL_return_last.*, with --miss-return LABEL_mrNN.* (the check job of attempt NN).
# Options that are off by default (without them the jobs, steps and stops are those of the earlier versions):
#   --conv C        passed as --conv C to every tools/reclose.py job of the run (attempts, returns, checks); without it no --conv is passed (reclose.py uses 1e-16). C must be a plain
#                   decimal number (^[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$, as reclose.py reads it) above 0 and at most 1e-12, otherwise exit 2.
#   --floor-try     after a rejection the next step is sign(d) max(|d| / 10, --min-dlam), and the run stops at the floor only after a rejection of a step already at --min-dlam
#                   (without it a start step that is not --min-dlam times a power of ten never tries the floor).
#   --miss-norm     predicted and miss are the root mean square of the per component relative values (g_k - b_k) / b_k and (g_k - s_k) / s_k (s = the solution) over the
#                   components that are not exactly 0 (a zero component is left out, measure_note 'zero component left out'; all three 0: 0, 'zero norm') instead of the largest of them.
#                   (Before, it was the Euclidean norm |g - b| / |b| over (u1, u2, t), which t dominates, so that a miss in u1 was not seen.)
#   --return-last   with at least 3 accepted steps a second return test after the first: the line through the last two accepted solutions at the lam of the accepted step before
#                   them, that step as reference, no --max-first, PASS as for the first return (LABEL_return_last.*, recorded as return_last); handed over needs both returns.
#                   With 2 accepted steps there is no second return (return_last says so) and the first decides.
#   --miss-return   when an attempt is rejected only by the miss test (done, converged, t > 0) and |d| <= D / 100 (D = |lam of b - lam of a|, a = the accepted solution before b, the back
#                   point for the first step), one check job LABEL_mrNN at the lam of a: guess on the line through b and the rejected solution, a as reference, no --max-first. If it is
#                   done, converged, t > 0 and within 1e-9 of a the attempt is accepted (accepted_by 'miss-return check'); the check is recorded in the attempt (miss_return) either way,
#                   with guess_dist, the largest per component relative distance of its guess from a (the guess is an extrapolation by a factor of 100 or more and is not bounded),
#                   and first_residual, the largest |r| of the check job at its guess (every return and check job records first_residual).
#                   (When the secant comes from two solutions far apart, miss / predicted tends to |z''| D / (2 |z'|) and does not get smaller with d.)
#   --edge-shrink   when b.lam + d would reach |lam| >= 1, d becomes sign(d) (1 - |b.lam|) / 2 if that is at least --min-dlam; only otherwise the stop '|lam| would reach 1'.
#   --safe          all five above (not --conv). With several on, the --miss-return check of a rejected attempt comes first; only if it stays rejected the next d is chosen.
# Recorded besides: dlam_last (the d of the last ATTEMPT, accepted or not), dlam_accepted (the d of the last accepted step), steps_done and steps_wanted, options, measure, lam_check,
# and per accepted step dz_cos, the cosine between (solution - previous solution) / dlam of this step and of the step before (null for the first), and reversed (dz_cos < 0, as at a jump
# to the other half of a fold; recorded only, not a stop).
# exit status 0 if handed over and the witness (if it was run) wrote its output with exit status 0, 1 otherwise, 2 for a bad call.
import sys, os, re, json, time, subprocess
sys.dont_write_bytecode = True
from mpmath import mp, mpf, nstr, sqrt, sign

here = os.path.dirname(os.path.abspath(__file__))
mp.dps = 50
USAGE = ('usage: python tools/handover-continue.py LABEL Z.json LAMZ BACK.json LAMBACK OUTDIR [--steps 5] [--dlam 1e-5] [--min-dlam 1e-7] [--minutes 20] [--ratio 0.1] [--max-first 0.1] [--witness-minutes 30] [--no-witness]\n'
         '    [--conv C] [--floor-try] [--miss-norm] [--return-last] [--miss-return] [--edge-shrink] [--safe]\n')
WITH_VALUE = ('--steps', '--dlam', '--min-dlam', '--minutes', '--ratio', '--max-first', '--witness-minutes', '--conv')
FLAGS = ('--no-witness', '--floor-try', '--miss-norm', '--return-last', '--miss-return', '--edge-shrink', '--safe')


def bad(msg):
    sys.stderr.write(msg + '\n' + USAGE); sys.exit(2)


pos, opt, i = [], {}, 1
while i < len(sys.argv):
    a = sys.argv[i]
    if a in FLAGS: opt[a] = True
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
    minutes = str(float(opt.get('--minutes', 20))); float(opt.get('--witness-minutes', 30))
    float(maxfirst); lamz, lamback = mpf(lamzs), mpf(lambacks)
    conv = opt.get('--conv')
    if conv is not None and not (re.match(r'^[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$', conv) and 0 < float(conv) <= 1e-12): bad('--conv must be a plain decimal number above 0 and at most 1e-12')
except ValueError as e:
    bad('bad number: ' + str(e))
if steps < 2: bad('--steps must be at least 2')
if dlam == 0 or mindlam <= 0 or lamz == lamback: bad('--dlam and --min-dlam must be nonzero and the two lam values must differ')
SAFE = '--safe' in opt
FLOORTRY, MISSNORM, RETURNLAST, MISSRETURN, EDGESHRINK = [SAFE or k in opt for k in ('--floor-try', '--miss-norm', '--return-last', '--miss-return', '--edge-shrink')]


def converged_output(f):
    try: o = json.load(open(f))
    except (OSError, ValueError): return None
    if not isinstance(o, dict): return None
    return o if o.get('converged') and all(k in o for k in ('u1', 'u2', 't')) else None


zo, bo = converged_output(zfile), converged_output(backfile)
if zo is None or bo is None: bad('Z.json and BACK.json must be converged outputs of tools/reclose.py')


def lam_agrees(o, lam, name, given):
    # reclose.py writes lam with 25 digits: the lam given on the command line must agree with it to 1e-24 (relative, absolute for 0)
    if 'lam' not in o: return 'no lam in file'
    try: fl = mpf(str(o['lam']))
    except ValueError: bad('%s has a lam that is not a number' % name)
    if abs(lam - fl) > mpf('1e-24') * (abs(fl) if fl != 0 else 1): bad('%s %s does not agree with the lam %s of %s' % (given, nstr(lam, 30), o['lam'], name))
    return 'agrees to 1e-24'


lam_check = dict(z=lam_agrees(zo, lamz, 'Z.json', 'LAMZ'), back=lam_agrees(bo, lamback, 'BACK.json', 'LAMBACK'))
try: zv, bv = [mpf(zo[k]) for k in ('u1', 'u2', 't')], [mpf(bo[k]) for k in ('u1', 'u2', 't')]
except (ValueError, TypeError): bad('u1, u2 and t of Z.json and BACK.json must be numbers')
if os.path.exists(outdir): bad('exists, not overwriting: ' + outdir)
os.makedirs(outdir)
tang = [(x - y) / (lamz - lamback) for x, y in zip(zv, bv)]
sols = [dict(lam=lamz, v=zv, file=os.path.basename(zfile), strs=dict(u1=zo['u1'], u2=zo['u2'], t=zo['t']))]
backpt = dict(lam=lamback, v=bv, file=os.path.basename(backfile), strs=dict(u1=bo['u1'], u2=bo['u2'], t=bo['t']))
res = dict(label=label, files=dict(z=os.path.basename(zfile), back=os.path.basename(backfile)), lam0=lamzs, lamback=lambacks, tangent=[nstr(x, 30) for x in tang], dlam_requested=str(dlam), dlam_last=None,
           steps=[], attempts=[], **{'return': None}, witness=None, stopped=None, handed_over=False,
           dlam_accepted=None, steps_done=0, steps_wanted=steps, lam_check=lam_check, measure='rms of the per component relative values' if MISSNORM else 'per component',
           options=dict(conv=conv, floor_try=FLOORTRY, miss_norm=MISSNORM, return_last=RETURNLAST, miss_return=MISSRETURN, edge_shrink=EDGESHRINK))
if RETURNLAST: res['return_last'] = None


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


def measure(a, b):
    # the size of a - b relative to b: the largest |a - b| / |b| over u1, u2, t (an exact zero component of b is left out), or with --miss-norm the root mean square of the
    # per component values (a_k - b_k) / b_k over the same components; the second value is a note (None if nothing was left out)
    q = rel([x for x, y in zip(a, b) if y != 0], [y for y in b if y != 0])
    if MISSNORM:
        if not q: return mpf(0), 'zero norm'
        return sqrt(sum(x * x for x in q) / len(q)), (None if len(q) == len(b) else 'zero component left out')
    return (max(q) if q else mpf(0)), (None if len(q) == len(b) else 'zero component left out')


def run(cmd, tag):
    t0 = time.time()
    p = subprocess.run([sys.executable, '-B'] + cmd, capture_output=True, text=True)
    open(os.path.join(outdir, tag + '.stdout'), 'w').write(p.stdout + p.stderr)
    return time.time() - t0, p.returncode


def reclose(tag, g, lam, ref, first_limit):
    # one job of tools/reclose.py; returns (output, {} if there is none, None if it is not valid JSON; seconds, exit status, name of the output file)
    job = dict(id=tag, u1=nstr(g[0], 40), u2=nstr(g[1], 40), lam=nstr(lam, 40), t=nstr(g[2], 40), ref=ref)
    jf, of = os.path.join(outdir, tag + '.job.json'), os.path.join(outdir, tag + '.out.json')
    json.dump(job, open(jf, 'x'))
    cmd = [os.path.join(here, 'reclose.py'), jf, of, '--minutes', minutes, '--digits', '50', '--tol', '30', '--floor', '1e-20']
    if first_limit is not None: cmd += ['--max-first', first_limit]
    if conv is not None: cmd += ['--conv', conv]
    sec, code = run(cmd, tag)
    o = {}
    if os.path.exists(of):
        try: o = json.load(open(of))
        except (OSError, ValueError): o = None
        if o is not None and not isinstance(o, dict): o = None
    return o, sec, code, os.path.basename(of)


def back_test(tag, g, lam, ref):
    # a re-closing that must come back to a known solution: PASS if done, converged, t > 0 and the largest relative difference from ref is at most 1e-9
    o, sec, code, of = reclose(tag, g, lam, ref, None)
    note = None
    if o is None: o, note = {}, 'output not valid JSON'
    dif = o.get('rel_diff_ref') or {}
    mx = max(dif.values()) if dif else None
    ok = bool(o.get('status') == 'done' and o.get('converged') and mpf(o['t']) > 0 and mx is not None and mx <= 1e-9)
    rec = {'file': of, 'status': o.get('status'), 'converged': bool(o.get('converged')), 't': o.get('t'), 'rel_diff_ref': dif or None, 'max_rel_diff_ref': mx, 'pass': ok, 'seconds': round(sec, 1), 'exit': code,
           'first_residual': o['iterations'][0]['residual'] if o.get('iterations') else None}
    if note: rec['reason'] = note
    return rec, ok


def cosine(p, q):
    a, b = sqrt(sum(x * x for x in p)), sqrt(sum(x * x for x in q))
    return None if a == 0 or b == 0 else float(sum(x * y for x, y in zip(p, q)) / (a * b))


def accept(att, lam, v, o, of, how, by=None):
    att['accepted'] = True
    sols.append(dict(lam=lam, v=v, file=of, strs=dict(u1=o['u1'], u2=o['u2'], t=o['t'])))
    dzc = None
    if len(sols) >= 3:
        p, q, s = sols[-3], sols[-2], sols[-1]
        dzc = cosine([(x - y) / (s['lam'] - q['lam']) for x, y in zip(s['v'], q['v'])], [(x - y) / (q['lam'] - p['lam']) for x, y in zip(q['v'], p['v'])])
    st = dict(step=len(sols) - 1, lam=nstr(lam, 25), file=of, guess_from=how, converged=True, updates=len(o['iterations']) - 1, first_residual=att['first_residual'], residual=o['residual'],
              seconds=att['seconds'], predicted=att['predicted'], miss=att['miss'], ratio=att['ratio'], dz_cos=dzc, reversed=(dzc < 0) if dzc is not None else None)
    if by: st['accepted_by'] = by
    res['steps'].append(st)
    res['dlam_accepted'] = att['d']; res['steps_done'] = len(res['steps'])
    print(label, 'attempt', n, 'accepted, step', len(sols) - 1, 'lam', nstr(lam, 20), 'seconds', att['seconds'], flush=True)
    dump()


d, n = dlam, 0
while len(sols) - 1 < steps:
    b = sols[-1]; lam = b['lam'] + d; shrunk = False
    if abs(lam) >= 1:
        dn = sign(d) * (1 - abs(b['lam'])) / 2
        if EDGESHRINK and abs(dn) >= mindlam: d = dn; lam = b['lam'] + d; shrunk = True
        else:
            res['stopped'] = 'attempt %d: |lam| would reach 1 (lam %s), no job' % (n + 1, nstr(lam, 25)); break
    if len(sols) == 1: g = [x + (lam - lamz) * y for x, y in zip(zv, tang)]; how = 'tangent through z and back'
    else:
        a = sols[-2]; r = (lam - b['lam']) / (b['lam'] - a['lam'])
        g = [vb + r * (vb - va) for va, vb in zip(a['v'], b['v'])]; how = 'secant through the two previous solutions'
    n += 1; tag = '%s_a%02d' % (label, n)
    res['dlam_last'] = str(d)
    o, sec, code, of = reclose(tag, g, lam, None, maxfirst)
    badjson = o is None
    if badjson: o = {}
    predicted, pnote = measure(g, b['v'])
    att = dict(tag=tag, lam=nstr(lam, 25), d=str(d), status=o.get('status'), converged=bool(o.get('converged')), t=o.get('t'), first_residual=o['iterations'][0]['residual'] if o.get('iterations') else None,
               predicted=float(predicted), miss=None, ratio=None, accepted=False, reason=None, seconds=round(sec, 1), exit=code)
    if pnote: att['measure_note'] = pnote
    if shrunk: att['edge_shrunk'] = True
    res['attempts'].append(att)
    if not o and not badjson:
        att['reason'] = 'reclose.py produced no output (exit %d)' % code
        res['stopped'] = 'attempt %d: %s' % (n, att['reason']); dump(); break
    if badjson:
        att['reason'] = 'output of %s not valid JSON (exit %d)' % (tag, code)
        res['stopped'] = 'attempt %d: %s' % (n, att['reason']); dump(); break
    v = missv = None
    if o.get('status') == 'done' and all(k in o for k in ('u1', 'u2', 't')):
        v = [mpf(o[x]) for x in ('u1', 'u2', 't')]
        missv, mnote = measure(g, v); att['miss'] = float(missv); att['ratio'] = float(missv / predicted) if predicted > 0 else None
        if mnote and 'measure_note' not in att: att['measure_note'] = mnote
    if o.get('status') != 'done': att['reason'] = 'status %s (exit %d)' % (o.get('status'), code)
    elif not o.get('converged'): att['reason'] = 'not converged (residual %s after %d updates)' % (o.get('residual'), len(o.get('iterations', [])) - 1)
    elif v is None: att['reason'] = 'output without u1, u2, t'
    elif not v[2] > 0: att['reason'] = 't not positive'
    elif missv > ratio_max * predicted:
        att['reason'] = 'miss %.3g above %s x predicted %.3g' % (att['miss'], nstr(ratio_max, 5), att['predicted'])
        if MISSRETURN:
            # the miss test alone rejected it: if the step is small against the step that made the secant, check that the line through b and this solution leads back to a
            a = sols[-2] if len(sols) >= 2 else backpt
            if abs(d) <= abs(b['lam'] - a['lam']) / 100 * (1 + mpf('1e-9')):
                r = (a['lam'] - b['lam']) / (lam - b['lam'])
                gm = [vb + r * (vs - vb) for vb, vs in zip(b['v'], v)]
                gq = rel([x for x, y in zip(gm, a['v']) if y != 0], [y for y in a['v'] if y != 0])
                rec, ok = back_test('%s_mr%02d' % (label, n), gm, a['lam'], a['strs'])
                att['miss_return'] = dict(guess_from='line through b and the rejected solution at the lam of a', lam=nstr(a['lam'], 25), guess_dist=float(max(gq)) if gq else None, **rec)
                print(label, 'attempt', n, 'miss-return check', 'PASS' if ok else 'FAIL', 'max rel diff', rec['max_rel_diff_ref'], flush=True)
                if ok:
                    att['miss_reason'] = att['reason']; att['reason'] = None; att['accepted_by'] = 'miss-return check'
                    accept(att, lam, v, o, of, how, 'miss-return check'); continue
    else:
        accept(att, lam, v, o, of, how); continue
    print(label, 'attempt', n, 'rejected:', att['reason'], flush=True)
    if FLOORTRY:
        if abs(d) <= mindlam * (1 + mpf('1e-9')):
            res['stopped'] = 'dlam %s at --min-dlam %s was rejected at attempt %d (%s), the next step would be below --min-dlam' % (nstr(d, 5), nstr(mindlam, 5), n, att['reason']); dump(); break
        d = sign(d) * max(abs(d) / 10, mindlam)
    else:
        d = d / 10
        if abs(d) < mindlam * (1 - mpf('1e-9')):
            res['stopped'] = 'dlam %s is below --min-dlam %s after attempt %d (%s)' % (nstr(d, 5), nstr(mindlam, 5), n, att['reason']); dump(); break
    dump()
res['steps_done'] = len(res['steps'])
if len(sols) >= 3:
    s1, s2 = sols[1], sols[2]; r = (lamz - s1['lam']) / (s2['lam'] - s1['lam'])
    g = [x + r * (y - x) for x, y in zip(s1['v'], s2['v'])]
    rec, ok = back_test(label + '_return', g, lamz, dict(u1=zo['u1'], u2=zo['u2'], t=zo['t']))
    res['return'] = {'guess_from': 'line through the first two accepted solutions at LAMZ', **rec}
    res['handed_over'] = ok
    print(label, 'return', 'PASS' if ok else 'FAIL', 'max rel diff', rec['max_rel_diff_ref'], flush=True)
    if RETURNLAST:
        if len(sols) < 4: res['return_last'] = {'pass': None, 'note': 'not made: fewer than 3 accepted steps'}
        elif not ok: res['return_last'] = {'pass': None, 'note': 'not made: the first return failed'}
        else:
            p, q, s = sols[-3], sols[-2], sols[-1]; r = (p['lam'] - q['lam']) / (s['lam'] - q['lam'])
            rec2, ok2 = back_test(label + '_return_last', [x + r * (y - x) for x, y in zip(q['v'], s['v'])], p['lam'], p['strs'])
            res['return_last'] = {'guess_from': 'line through the last two accepted solutions at the lam of the accepted step before them', 'lam': nstr(p['lam'], 25), **rec2}
            res['handed_over'] = ok and ok2
            print(label, 'return_last', 'PASS' if ok2 else 'FAIL', 'max rel diff', rec2['max_rel_diff_ref'], flush=True)
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
