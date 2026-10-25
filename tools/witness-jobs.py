# makes the witness jobs of a list of points: one job file per point for tools/witness.py and a queue file for tools/run-queue.py.
# python tools/witness-jobs.py POINTS.json OUTDIR QUEUE.json [--preset w1|w1b] [--minutes 30] [--only ID [ID ...]]
#   POINTS.json: a list of {"id", "u1", "u2", "lam", "t", ...} (see tools/trace-witnesses.py points). Writes OUTDIR/points.json (a copy of the list), OUTDIR/jobs/<id>.json, the folder OUTDIR/mp/
#   for the results and QUEUE.json; neither OUTDIR/points.json nor QUEUE.json may exist. Run the queue with: python tools/run-queue.py QUEUE.json 3
#   --only: just these ids. The results are OUTDIR/mp/<id>.json; tools/witness-check.py checks them, tools/trace-witnesses.py summary reads them.
import sys, os, json

PRESETS = ('w1', 'w1b')


def option(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    pts = json.load(open(sys.argv[1])); outdir, qf = sys.argv[2], sys.argv[3]
    preset, minutes = option('--preset', 'w1'), option('--minutes', '30')
    if preset not in PRESETS: sys.exit('preset must be one of ' + ', '.join(PRESETS))
    if '--only' in sys.argv:
        i = sys.argv.index('--only') + 1; only = []
        while i < len(sys.argv) and not sys.argv[i].startswith('--'): only.append(sys.argv[i]); i += 1
        pts = [p for p in pts if p['id'] in only]
        if len(pts) != len(only): sys.exit('some of the ids are not in the points file')
    for p in (os.path.join(outdir, 'points.json'), qf):
        if os.path.exists(p): sys.exit('exists, not overwriting: ' + p)
    ids = [p['id'] for p in pts]
    if len(ids) != len(set(ids)): sys.exit('duplicate ids')
    os.makedirs(os.path.join(outdir, 'jobs')); os.makedirs(os.path.join(outdir, 'mp'))
    json.dump(pts, open(os.path.join(outdir, 'points.json'), 'x'), indent=1)
    queue = []
    for p in pts:
        job = os.path.join(outdir, 'jobs', p['id'] + '.json'); out = os.path.join(outdir, 'mp', p['id'] + '.json')
        json.dump(dict(id=p['id'], u1=p['u1'], u2=p['u2'], lam=p['lam'], t=p['t']), open(job, 'x'))
        queue.append(dict(id=p['id'], cmd=['tools/witness.py', job, out, '--preset', preset, '--minutes', minutes], out=out, limit_min=float(minutes)))
    json.dump(queue, open(qf, 'x'), indent=1)
    print('%d jobs (%s), queue %s' % (len(queue), preset, qf))


if __name__ == '__main__':
    main()
