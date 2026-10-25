# acceptance of the unregularised multiple precision flow (50 digits, tolerance 1e-30, step floor 1e-20) that is used as a witness for orbits with a pair distance down to 1e-10:
# it must reproduce the exact Kepler flow of a near-radial pair (periapsis distance q) after one period to 1e-17, without a collapse of the step size.
# python tools/witness-acceptance.py [--q 1e-8 1e-10 ...] [--stored data/deep/witness-acceptance.json] [--dir DIR] [--jobs N] [--out result.json]
#   runs tools/kepler-check.py for every q (default 1e-8 and 1e-10, the seven stored ones with --q all), at most N at a time, and compares with the stored values: PASS if the error is
#   at most 1e-17 and within a factor 2 of the stored error. The files of the runs go to DIR (default: a temporary directory). Takes about 15 s per q. Exit status 1 if a row fails.
import sys, os, json, glob, subprocess, tempfile, time

here = os.path.dirname(os.path.abspath(__file__))
LIMIT = 1e-17
ALL = ['1e-7', '1e-8', '3e-9', '1e-9', '5e-10', '3e-10', '1e-10']


def args(name, n=None):
    if name not in sys.argv: return []
    i = sys.argv.index(name) + 1; out = []
    while i < len(sys.argv) and not sys.argv[i].startswith('--'): out.append(sys.argv[i]); i += 1
    return out


def main():
    qs = args('--q') or ['1e-8', '1e-10']
    if qs == ['all']: qs = ALL
    stored_file = (args('--stored') or [os.path.join(os.path.dirname(here), 'data', 'deep', 'witness-acceptance.json')])[0]
    outdir = (args('--dir') or [tempfile.mkdtemp(prefix='witness-acceptance-')])[0]; os.makedirs(outdir, exist_ok=True)
    if glob.glob(os.path.join(outdir, 'kepler-q*.json')): sys.exit('exists, not overwriting: the folder ' + outdir + ' holds kepler-q*.json')
    jobs = int((args('--jobs') or ['2'])[0]); result_file = (args('--out') or [None])[0]
    if result_file and os.path.exists(result_file): sys.exit('exists, not overwriting: ' + result_file)
    stored = {r['q']: r for r in json.load(open(stored_file))['rows']}
    running = []; files = {}
    for q in qs:
        while len(running) >= jobs:
            running = [p for p in running if p.poll() is None]; time.sleep(0.5)
        files[q] = os.path.join(outdir, 'kepler-q%s.json' % q)
        running.append(subprocess.Popen([sys.executable, '-B', os.path.join(here, 'kepler-check.py'), q, files[q], '--digits', '50', '--tol', '30', '--floor', '1e-20'], stdout=subprocess.DEVNULL))
    for p in running: p.wait()
    rows = []; ok_all = True
    print('%-7s %-8s %-12s %-12s %6s %8s %12s %8s  %s' % ('q', 'status', 'error', 'stored', 'steps', 'rejected', 'min step', 'seconds', 'result'))
    for q in qs:
        d = json.load(open(files[q])) if os.path.exists(files[q]) else {'status': 'no output'}
        s = stored.get(q)
        err = float(d['error_max']) if d.get('status') == 'done' else None
        same = err is not None and s is not None and 0.5 <= err / float(s['error_max']) <= 2
        ok = d.get('status') == 'done' and err <= LIMIT and same
        ok_all = ok_all and ok
        rows.append(dict(q=q, status=d.get('status'), error_max=d.get('error_max'), stored_error_max=(s or {}).get('error_max'), steps=d.get('steps'), rejected=d.get('rejected'), min_accepted_step=d.get('min_accepted_step'), seconds=d.get('seconds'), passed=bool(ok)))
        print('%-7s %-8s %-12s %-12s %6s %8s %12s %8s  %s' % (q, d.get('status'), d.get('error_max', '-'), (s or {}).get('error_max', '-'), d.get('steps', '-'), d.get('rejected', '-'), ('%.3g' % d['min_accepted_step']) if d.get('min_accepted_step') else '-', d.get('seconds', '-'), 'PASS' if ok else 'FAIL'))
    if result_file: json.dump(dict(limit=LIMIT, rows=rows, all_pass=ok_all), open(result_file, 'x'), indent=1)
    sys.exit(0 if ok_all else 1)


if __name__ == '__main__':
    main()
