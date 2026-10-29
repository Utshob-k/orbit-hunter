# tools/reclose.py (default settings, 50 digits) at the start values of the 33 witnessed points that have a w1b result, at their stored lam: does the stored start values close, in one update,
# to the same orbit, and how far is the closed orbit from the stored start values (the largest relative change of u1, u2, t of a point).
#   python tools/reclose-w1b.py run DIR [JOBS|--only ID]  DIR must be new (or may hold earlier results of other ids): writes DIR/jobs/<id>.json and DIR/res/<id>.json (the output of tools/reclose.py)
#                                                            for every point, JOBS at a time (default 3), or for the one point ID; 85 to 500 s for a point, about 30 minutes in all at 3 at a time on the machine of the stored run
#   python tools/reclose-w1b.py summary DIR OUT.json         reads DIR/res/<id>.json of every point and writes OUT.json (new): one row for each point and the comparison with data/deep/reclose/*.json
import json, os, sys, subprocess, time
from concurrent.futures import ThreadPoolExecutor

here = os.path.dirname(os.path.abspath(__file__))
data = os.path.join(os.path.dirname(here), 'data', 'deep')
FAM = ('t35m', 't44m', 't62m', 't72m')


def points():
    out = []
    for lab in FAM:
        for p in json.load(open(os.path.join(data, 'witnesses', lab + '.json')))['points']:
            if p.get('w1b'):
                out.append(p)
    return out


def run(d, jobs, only):
    os.makedirs(d + '/jobs', exist_ok=True)
    os.makedirs(d + '/res', exist_ok=True)
    ids = []
    for p in points():
        if only and p['id'] != only:
            continue
        j = dict(id=p['id'], u1=p['u1'], u2=p['u2'], lam=p['lam'], t=p['t'], ref=dict(u1=p['u1'], u2=p['u2'], t=p['t']))
        if os.path.exists('%s/jobs/%s.json' % (d, p['id'])):
            sys.exit('exists, not overwriting: %s/jobs/%s.json' % (d, p['id']))
        json.dump(j, open('%s/jobs/%s.json' % (d, p['id']), 'x'))
        ids.append(p['id'])
    print(len(ids), 'jobs', flush=True)

    def one(i):
        t0 = time.time()
        r = subprocess.run([sys.executable, '-B', os.path.join(here, 'reclose.py'), '%s/jobs/%s.json' % (d, i), '%s/res/%s.json' % (d, i)], capture_output=True, text=True)
        print(i, r.stdout.strip()[-200:], r.stderr.strip()[-200:], round(time.time() - t0), 's', flush=True)
    with ThreadPoolExecutor(jobs) as ex:
        list(ex.map(one, ids))
    print('done', len(ids), flush=True)


def summary(d, out):
    if os.path.exists(out):
        sys.exit('exists, not overwriting: ' + out)
    rows = []
    for p in points():
        r = json.load(open('%s/res/%s.json' % (d, p['id'])))
        it0 = r['iterations'][0]
        ch = r.get('rel_diff_ref') or {}
        rows.append(dict(id=p['id'], converged=r.get('converged'), same_orbit=r.get('same_orbit'), updates=len(r['iterations']) - 1, first_residual=it0['residual'],
                         largest_change=max(ch.values()) if ch else None, change=ch, seconds=r.get('elapsed_s')))
    stored = {}
    for lab in FAM:
        for x in json.load(open(os.path.join(data, 'reclose', lab + '.json')))['rows']:
            if x['type'] == 'step':
                stored[(lab, x['steps'][0])] = x
    comp = []
    for r in rows:
        lab = r['id'][:4]
        step = int(r['id'].split('u')[-1]) if '-u' in r['id'] else None
        if step is not None and (lab, step) in stored:
            comp.append(dict(id=r['id'], stored_largest_change=max(stored[(lab, step)]['rel_diff'].values()), largest_change=r['largest_change']))
    what = ('tools/reclose.py (default settings: 50 digits, tolerance 1e-30) at the stored start values (u1, u2, lam, t) of the %d witnessed points that have a w1b result, at their stored lam: whether it converged, '
            'whether the closed orbit is the same orbit (change of (u1, u2, t) at most 1e-9 relative), the number of updates, the first residual and the relative change of u1, u2 and t of each point '
            '(largest_change: the largest of the three). "comparison" lists the points that are also accepted steps of data/deep/reclose/*.json, with the largest relative change stored there. '
            'These are the stored results of the commands in "command" (85 to 500 s for a point); the output of tools/reclose.py of each point is in the raw files (stall/reclose-w1b/res/).') % len(rows)
    cmd = ['python tools/reclose-w1b.py run stall/reclose-w1b', 'python tools/reclose-w1b.py summary stall/reclose-w1b OUT.json']
    json.dump(dict(what=what, command=cmd, rows=rows, comparison=comp), open(out, 'x'), indent=1)
    print('%d points: converged %d, same orbit %d, updates %s; largest change %.3e' % (len(rows), sum(bool(r['converged']) for r in rows), sum(bool(r['same_orbit']) for r in rows),
          sorted(set(r['updates'] for r in rows)), max(r['largest_change'] for r in rows)))


if len(sys.argv) >= 3 and sys.argv[1] == 'run':
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    rest = [a for a in sys.argv[3:] if a != '--only' and a != only]
    run(sys.argv[2], int(rest[0]) if rest else 3, only)
elif len(sys.argv) >= 4 and sys.argv[1] == 'summary':
    summary(sys.argv[2], sys.argv[3])
else:
    sys.exit('usage: python tools/reclose-w1b.py run DIR [JOBS | --only ID]  or  summary DIR OUT.json')
