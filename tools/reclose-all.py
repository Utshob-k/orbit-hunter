# SPDX-License-Identifier: MIT
# tools/reclose.py (default settings, 50 digits) at the stored start values of ALL witnessed points of the four traces (the 854 points of data/deep/witnesses/: t35 - 69, t44 - 124, t62 - 336,
# t72 - 325), at their stored lam: does the stored point close, in how many updates, to the same orbit, and how far is the closed orbit from the stored start values (the largest relative change
# of u1, u2, t of a point) and what is the closing residual of the stored point (the first residual). tools/reclose-w1b.py does the same for the 33 points with a w1b result.
#   python tools/reclose-all.py queue DIR        DIR must be new: writes DIR/jobs/<id>.json and the queue DIR/queue.json for tools/run-queue.py (every job is tools/reclose.py, 60 minutes at most)
#   python tools/run-queue.py DIR/queue.json 3   runs them, 3 at a time; the results are DIR/res/<id>.json (the output of tools/reclose.py); 45 to 370 s for a point
#   python tools/reclose-all.py summary DIR OUT.json   reads DIR/res/<id>.json of every point and writes OUT.json (new): one row for each point and totals
import json, os, sys

here = os.path.dirname(os.path.abspath(__file__))
data = os.path.join(os.path.dirname(here), 'data', 'deep')
FAM = ('t35m', 't44m', 't62m', 't72m')


def points():
    out = []
    for lab in FAM:
        for p in json.load(open(os.path.join(data, 'witnesses', lab + '.json')))['points']:
            out.append(p)
    return out


def queue(d):
    if os.path.exists(d): sys.exit('exists, not overwriting: ' + d)
    os.makedirs(d + '/jobs'); os.makedirs(d + '/res')
    q = []
    for p in points():
        j = dict(id=p['id'], u1=p['u1'], u2=p['u2'], lam=p['lam'], t=p['t'], ref=dict(u1=p['u1'], u2=p['u2'], t=p['t']))
        jf = '%s/jobs/%s.json' % (d, p['id']); json.dump(j, open(jf, 'x'))
        q.append(dict(id=p['id'], cmd=[os.path.join(here, 'reclose.py'), jf, '%s/res/%s.json' % (d, p['id']), '--minutes', '60'], out='%s/res/%s.json' % (d, p['id']), limit_min=60))
    json.dump(q, open(d + '/queue.json', 'x'), indent=1)
    print(len(q), 'jobs in', d + '/queue.json')


def summary(d, out):
    if os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    rows = []; missing = []
    for p in points():
        f = '%s/res/%s.json' % (d, p['id'])
        if not os.path.exists(f): missing.append(p['id']); continue
        r = json.load(open(f))
        if 'iterations' not in r: missing.append(p['id']); continue
        ch = r.get('rel_diff_ref') or {}
        rows.append(dict(id=p['id'], converged=r.get('converged'), same_orbit=r.get('same_orbit'), updates=len(r['iterations']) - 1, first_residual=r['iterations'][0]['residual'], largest_change=max(ch.values()) if ch else None, seconds=r.get('elapsed_s')))
    ch = [x['largest_change'] for x in rows if x['largest_change'] is not None]
    tot = dict(points=len(points()), done=len(rows), missing=len(missing), converged=sum(1 for x in rows if x['converged']), same_orbit=sum(1 for x in rows if x['same_orbit']), max_updates=max((x['updates'] for x in rows), default=None),
               largest_change=max(ch) if ch else None, largest_first_residual=max((x['first_residual'] for x in rows), default=None))
    per = {}
    for x in rows:
        lab = x['id'].split('-')[0]; a = per.setdefault(lab, dict(points=0, largest_change=0.0, largest_first_residual=0.0))
        a['points'] += 1; a['largest_change'] = max(a['largest_change'], x['largest_change'] or 0); a['largest_first_residual'] = max(a['largest_first_residual'], x['first_residual'])
    json.dump(dict(what='all witnessed points of the four traces closed again at the stored lam by tools/reclose.py (50 digits), tools/reclose-all.py', totals=tot, per_trace=per, missing=missing, rows=rows), open(out, 'x'))
    print(json.dumps(tot, indent=1)); print(json.dumps(per, indent=1))


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'queue': queue(sys.argv[2])
    elif len(sys.argv) > 3 and sys.argv[1] == 'summary': summary(sys.argv[2], sys.argv[3])
    else: sys.exit('usage: python tools/reclose-all.py queue DIR | summary DIR OUT.json')
