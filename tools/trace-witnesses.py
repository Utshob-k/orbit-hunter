# SPDX-License-Identifier: MIT
# witnesses of a trace written by tools/family-follow-ias.mjs: which points to witness, which of them need the deeper witness, and the reading of the results.
# python tools/trace-witnesses.py points TRACE.json OUT.json [--cap 400] [--s S]
#     the points to witness, as a list for tools/witness-jobs.py: the KEPT points (a recorded point is kept if its lam differs from that of the last kept point by at least 0.01 s, the first point is kept;
#     s is --s or the median |dlam| of the first 20 recorded steps) and the UNRECORDED accepted steps (reason "perpInfo null"), each at most --cap. Ids are <label>-k<index> and <label>-u<step>.
# python tools/trace-witnesses.py select WITDIR OUT.json
#     from a folder of tools/witness.py results (w1): the points whose smallest pair distance is below 1e-7 or whose job did not finish, to be witnessed again with the w1b preset.
# python tools/trace-witnesses.py summary TRACE.json WITDIR[,WITDIR2] [W1BDIR[,W1BDIR2]] --checks CHECK.json[,..] [--checks-w1b CHECK.json[,..]] [--cap 400] [--s S] [--out SUMMARY.json]
#     the reading. A point is WITNESSED if the w1 result has a pair distance minimum of 1e-7 or more, or the w1b result 1e-10 or more, with a closure below 1e-6 and the energy and angular momentum check of
#     tools/witness-check.py passed; CLOSURE FAILED if a finished result has a closure of 1e-6 or more; otherwise UNCHECKED (not finished, below 1e-10, check failed, no job, beyond the cap).
#     The STRICT CHAIN runs over all points in the order of the loop step and is cut at the first point that is not witnessed; the strict witnessed depth is the smallest minimum before the cut.
#     TURNED: a witnessed minimum followed by a rise by a factor 2 or more, witnessed points on both sides (quoted as "the witnessed closest approach turns at d = ..."). Further turns (information):
#     witnessed local minima below 1e-6, lower than both neighbours in the order of the steps, with a rise of a factor 2 or more on both sides before the next local minimum or the end.
# python tools/trace-witnesses.py reading WITNESSES.json [--trace TRACE.json]
#     the same reading from a compact witness file of data/deep/witnesses/ (no raw results needed). With --trace (the trace file of data/deep/traces/) it also prints how many recorded points of the trace
#     were not selected for witnessing and the step ranges of the runs of such points, and, if the witness file has them, the s of the kept-point rule and the ids added outside the rule.
import sys, os, json, statistics

CAP_DEFAULT = 400


def option(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def load_trace(f):
    d = json.load(open(f)); label = d.get('label') or os.path.basename(f).replace('.json', ''); return d, label


def kept_indices(P, s):
    if not P: return [], None
    if s is None:
        dl = [abs(P[i]['lam'] - P[i - 1]['lam']) for i in range(1, min(21, len(P)))]; s = statistics.median(dl) if dl else None
    kept = [0]
    if s is not None:
        for i in range(1, len(P)):
            if abs(P[i]['lam'] - P[kept[-1]]['lam']) >= 0.01 * s: kept.append(i)
    return kept, s


def make_points(trace, out, cap, s):
    d, label = load_trace(trace)
    if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    P = d.get('points') or []; kept, s = kept_indices(P, s)
    pts = [dict(id='%s-k%04d' % (label, i), run=label, index=i, kind='kept', rank=r, step=P[i]['step'], u1=P[i]['u1'], u2=P[i]['u2'], lam=P[i]['lam'], t=P[i]['t'], minDist=P[i]['minDist']) for r, i in enumerate(kept[:cap])]
    un = sorted([u for u in d.get('unrec', []) if u.get('reason') == 'perpInfo null'], key=lambda u: u['step'])
    pts += [dict(id='%s-u%04d' % (label, u['step']), run=label, index=u['step'], kind='unrec', rank=r, step=u['step'], u1=u['u1'], u2=u['u2'], lam=u['lam'], t=u['t'], minDist=None) for r, u in enumerate(un[:cap])]
    json.dump(pts, open(out, 'x'), indent=1)
    print('%s: %d recorded points, %d kept (%d written, %d beyond the cap), s = %s; %d unrecorded steps (%d written)' % (label, len(P), len(kept), min(len(kept), cap), max(0, len(kept) - cap), ('%.6g' % s) if s else 'undefined', len(un), min(len(un), cap)))


def result(dirs, pid):
    for d in dirs:
        f = os.path.join(d, 'mp', pid + '.json')
        if d != '-' and os.path.exists(f):
            m = json.load(open(f))
            if m.get('status') != 'done': return dict(done=False)
            return dict(done=True, d=m['dmin_parabolic'] if m.get('dmin_parabolic') is not None else m['dmin'], closure=m['closure'])
    return None


def select_low(wd, out):
    if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    sel = []
    for w in json.load(open(os.path.join(wd, 'points.json'))):
        r = result([wd], w['id'])
        if r is None or not r['done'] or r['d'] < 1e-7: sel.append(w)
    json.dump(sel, open(out, 'x'), indent=1); print('selected for w1b: %d (%s)' % (len(sel), [w['id'] for w in sel]))


def classify(a, b, ca, cb):
    # a, b: the w1 and the w1b result of one point (dict with done, d, closure, or None); ca, cb: the energy and angular momentum checks of them. Returns (status, value).
    okA = bool(a and a['done'] and a['closure'] < 1e-6 and a['d'] >= 1e-7 and ca is True)
    okB = bool(b and b['done'] and b['closure'] < 1e-6 and b['d'] >= 1e-10 and cb is True)
    if okA: return 'witnessed (w1)', a['d']
    if okB: return 'witnessed (w1b)', b['d']
    if (a and a['done'] and a['closure'] >= 1e-6) or (b and b['done'] and b['closure'] >= 1e-6): return 'CLOSURE FAILED', None
    if a is None and b is None: return 'UNCHECKED (no result)', None
    if (a and not a['done']) and not (b and b['done']): return 'UNCHECKED (not finished)', None
    if b and b['done'] and b['d'] < 1e-10: return 'UNCHECKED (below 1e-10)', None
    if (a and a['done'] and a['d'] < 1e-7) and not b: return 'UNCHECKED (below 1e-7, no w1b result)', None
    return 'UNCHECKED (check failed)', None


def reading(rows, lines):
    # rows: dicts with step, ok, value, status; appends the strict chain, the strict witnessed depth, TURNED and the further turns to lines; returns the numbers
    rows.sort(key=lambda r: r['step'])
    cut = next((r for r in rows if not r['ok']), None); pre = [r for r in rows if cut is None or r['step'] < cut['step']]; sw = min((r['value'] for r in pre), default=None)
    lines.append('points %d: witnessed %d, closure failed %d, unchecked %d' % (len(rows), sum(1 for r in rows if r['ok']), sum(1 for r in rows if r['status'] == 'CLOSURE FAILED'), sum(1 for r in rows if r['status'].startswith('UNCHECKED'))))
    lines.append('STRICT CHAIN: %s; STRICT WITNESSED DEPTH %s' % (('cut at step %d (%s)' % (cut['step'], cut['status'])) if cut else 'no cut', ('%.5e at step %d' % (sw, min(r['step'] for r in pre if r['value'] == sw))) if sw is not None else 'undefined'))
    Wt = [r for r in rows if r['ok']]; turned = False; further = []; turn = None
    if Wt:
        vals = [r['value'] for r in Wt]; k = min(range(len(Wt)), key=lambda i: vals[i]); rest = vals[k + 1:]
        turned = 0 < k < len(Wt) - 1 and max(rest) >= 2 * vals[k]; turn = dict(d=vals[k], step=Wt[k]['step'])
        lines.append('TURNED: ' + (('the witnessed closest approach turns at d = %.5e (step %d)' % (vals[k], Wt[k]['step'])) if turned else 'no (smallest witnessed minimum %.5e at step %d)' % (vals[k], Wt[k]['step'])))
        lm = [j for j in range(1, len(Wt) - 1) if vals[j] < vals[j - 1] and vals[j] < vals[j + 1]]
        for n, j in enumerate(lm):
            lo = lm[n - 1] if n > 0 else -1; hi = lm[n + 1] if n + 1 < len(lm) else len(Wt)
            mb = max(vals[lo + 1:j]) if j > lo + 1 else 0; ma = max(vals[j + 1:hi]) if hi > j + 1 else 0
            if vals[j] < 1e-6 and mb >= 2 * vals[j] and ma >= 2 * vals[j] and j != k: further.append(dict(d=vals[j], step=Wt[j]['step']))
        lines.append('further turns below 1e-6: ' + ('; '.join('d = %.4e, step %d' % (f['d'], f['step']) for f in further) if further else 'none'))
    return dict(strict_depth=sw, cut_step=(cut or {}).get('step'), turned=turned, turn=turn, further=further)


def reading_from_data(f, trace=None):
    # the reading from a compact witness file of data/deep/witnesses/ (no raw results needed)
    d = json.load(open(f)); rows = []
    for r in d['points']:
        a = r.get('w1'); b = r.get('w1b')
        ra = dict(done=True, d=a['dmin_parabolic'], closure=a['closure']) if a else None; rb = dict(done=True, d=b['dmin_parabolic'], closure=b['closure']) if b else None
        st, v = classify(ra, rb, a.get('check_1e14') if a else None, b.get('check_1e14') if b else None)
        rows.append(dict(id=r['id'], step=r['step'], kind=r['kind'], status=st, value=v, ok=v is not None))
    for x in d.get('unwitnessed', []): rows.append(dict(id=x['id'], step=x['step'], kind='recorded', status=x['status'], value=None, ok=False))
    lines = ['%s: %s' % (d['label'], d.get('why'))]; out = reading(rows, lines)
    if 's' in d: lines.append('kept-point rule: s = %.8g; ids added outside the rule: %s' % (d['s'], ', '.join(d.get('added', [])) or 'none'))
    if trace:
        T = json.load(open(trace)); P = T['points']; have = set(r['step'] for r in d['points'] if r['kind'] != 'unrecorded')
        runs = []; cur = None
        for p in P:
            if p['step'] in have: cur = None; continue
            if cur is None: cur = [p['step'], p['step'], 0]; runs.append(cur)
            cur[1] = p['step']; cur[2] += 1
        n_not = sum(r[2] for r in runs)
        lines.append('recorded points of %s: %d; selected for witnessing: %d; NOT selected: %d in %d runs' % (os.path.basename(trace), len(P), len(P) - n_not, n_not, len(runs)))
        big = sorted(runs, key=lambda r: -r[2])[:6]
        lines.append('  step range of the points not selected: %s; the longest runs (first step - last step, number of points): %s' % ('%d-%d' % (runs[0][0], runs[-1][1]) if runs else 'none', '; '.join('%d-%d (%d)' % tuple(r) for r in big) or 'none'))
    print('\n'.join(lines)); return out


def summary(trace, w1dirs, w1bdirs, checkfiles, checkfiles_b, cap, s, outj):
    d, label = load_trace(trace); P = d.get('points') or []
    chk, chkb = {}, {}
    for f in checkfiles:
        for r in json.load(open(f)): chk[r['id']] = r
    for f in checkfiles_b:
        for r in json.load(open(f)): chkb[r['id']] = r
    W = {}
    for dd in w1dirs + w1bdirs:
        if dd != '-' and os.path.exists(os.path.join(dd, 'points.json')):
            for w in json.load(open(os.path.join(dd, 'points.json'))): W[w['id']] = w
    kept, s = kept_indices(P, s); rows = []
    for rank, i in enumerate(kept):
        pid = '%s-k%04d' % (label, i)
        if rank >= cap: rows.append(dict(id=pid, step=P[i]['step'], kind='kept', lam=P[i]['lam'], status='UNCHECKED (beyond the cap of %d)' % cap, ok=False, value=None))
        elif pid not in W: rows.append(dict(id=pid, step=P[i]['step'], kind='kept', lam=P[i]['lam'], status='UNCHECKED (no witness job)', ok=False, value=None))
    seen = set(r['id'] for r in rows)
    for pid, w in W.items():
        if pid in seen: continue
        a = result(w1dirs, pid); b = result(w1bdirs, pid)
        st, val = classify(a, b, chk.get(pid, {}).get('check_1e14'), chkb.get(pid, {}).get('check_1e14'))
        rows.append(dict(id=pid, step=w['step'], kind=w.get('kind', 'kept' if '-k' in pid else 'unrec'), lam=w['lam'], w1=(a or {}).get('d'), w1b=(b or {}).get('d'), closure=(a or b or {}).get('closure'), status=st, value=val, ok=val is not None))
    rows.sort(key=lambda r: r['step'])
    L = ['%s: %s; %d recorded points, %d unrecorded accepted steps, lam %.6f to %.6f; guard trips %s, cross-check replaced %s' % (label, d.get('why'), len(P), len(d.get('unrec') or []), P[0]['lam'] if P else float('nan'), P[-1]['lam'] if P else float('nan'),
                                                                                                                       (d.get('guards') or {}).get('trips'), (d.get('guards') or {}).get('replaced'))]
    L.append('%-16s %6s %-6s %12s %13s %13s %10s  %s' % ('point', 'step', 'kind', 'lam', 'w1 min', 'w1b min', 'closure', 'status'))
    for r in rows:
        L.append('%-16s %6d %-6s %12.8f %13s %13s %10s  %s' % (r['id'], r['step'], r['kind'], r['lam'], ('%.5e' % r['w1']) if r.get('w1') is not None else '-', ('%.5e' % r['w1b']) if r.get('w1b') is not None else '-', ('%.1e' % r['closure']) if r.get('closure') is not None else '-', r['status']))
    out = reading(rows, L)
    print('\n'.join(L))
    if outj:
        if os.path.exists(outj): sys.exit('exists, not overwriting: ' + outj)
        json.dump(dict(label=label, why=d.get('why'), rows=rows, **out), open(outj, 'x'), indent=1)


def main():
    cmd = sys.argv[1]; cap = int(option('--cap', CAP_DEFAULT)); s = float(option('--s', 0)) or None
    if cmd == 'points': make_points(sys.argv[2], sys.argv[3], cap, s)
    elif cmd == 'select': select_low(sys.argv[2], sys.argv[3])
    elif cmd == 'reading': reading_from_data(sys.argv[2], option('--trace', None))
    elif cmd == 'summary':
        pos = []; i = 3
        while i < len(sys.argv):
            if sys.argv[i].startswith('--'): i += 2
            else: pos.append(sys.argv[i]); i += 1
        split = lambda v: v.split(',') if v else []
        summary(sys.argv[2], pos[0].split(','), pos[1].split(',') if len(pos) > 1 else ['-'], split(option('--checks', '')), split(option('--checks-w1b', '')), cap, s, option('--out', None))
    else: sys.exit('usage: points | select | reading | summary')


if __name__ == '__main__':
    main()
