# checks the results of tools/witness.py in a folder made by tools/witness-jobs.py: for every point the status, the closure of the full period, the smallest pair distance (sampled and
# parabolic), the seconds, and the relative change of the energy and of the angular momentum of the end state x_full (the digits of the preset: 40 for w1, 50 for w1b) against the start state of the perpendicular start:
#   E = sum of |v|^2 / 2 over the three bodies minus the sum of 1/r over the three pairs (masses 1, G = 1), L = sum (x vy - y vx); |dE| / |E0| and |dL| / max(|L0|, 1e-3).
# A finished point passes the check if both are at most 1e-14: the integration conserved what it should, so the closure is a property of the numbers (u1, u2, lam, t) and not of the flow.
# python tools/witness-check.py WITDIR [--out CHECK.json]     prints a table and one summary line; CHECK.json (must be new) holds one record per point, read by tools/trace-witnesses.py summary
import sys, os, json
sys.dont_write_bytecode = True
from mpmath import mp, mpf, sqrt

mp.dps = 50


def perp_initial(u1, u2, lam):
    cm = lam / 3
    return [-1 - cm, 0.0, lam - cm, 0.0, 1 - cm, 0.0, 0.0, u1, 0.0, u2, 0.0, -u1 - u2]


def energy_and_l(x):
    x = [mpf(v) for v in x]; E = mpf(0); L = mpf(0)
    for i in range(3):
        E += (x[6 + 2 * i] ** 2 + x[7 + 2 * i] ** 2) / 2; L += x[2 * i] * x[7 + 2 * i] - x[2 * i + 1] * x[6 + 2 * i]
    for i in range(3):
        for j in range(i + 1, 3): E -= 1 / sqrt((x[2 * j] - x[2 * i]) ** 2 + (x[2 * j + 1] - x[2 * i + 1]) ** 2)
    return E, L


def main():
    wd = sys.argv[1]
    out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
    if out and os.path.exists(out): sys.exit('exists, not overwriting: ' + out)
    pts = json.load(open(os.path.join(wd, 'points.json'))); lines = []; recs = []
    lines.append('%-18s %-9s %-12s %11s %11s %8s %9s %9s %s' % ('point', 'status', 'closure', 'dmin', 'dmin_parab', 'seconds', 'dE/E', 'dL/L', 'check'))
    for w in pts:
        f = os.path.join(wd, 'mp', w['id'] + '.json')
        m = json.load(open(f)) if os.path.exists(f) else None
        rec = dict(id=w['id'], lam=w['lam'])
        if not m: rec.update(status='no result'); lines.append('%-18s no result' % w['id']); recs.append(rec); continue
        rec.update(status=m.get('status'), closure=m.get('closure'), dmin=m.get('dmin'), dmin_parabolic=m.get('dmin_parabolic'), seconds=m.get('seconds_total'), error=m.get('error'))
        if m.get('status') == 'done' and m.get('x_full'):
            E0, L0 = energy_and_l(perp_initial(w['u1'], w['u2'], w['lam'])); E1, L1 = energy_and_l(m['x_full'])
            rec['dE'] = float(abs(E1 - E0) / abs(E0)); rec['dL'] = float(abs(L1 - L0) / max(abs(L0), mpf('1e-3'))); rec['check_1e14'] = bool(rec['dE'] <= 1e-14 and rec['dL'] <= 1e-14)
        lines.append('%-18s %-9s %-12s %11.4g %11.4g %8s %9s %9s %s' % (w['id'], rec['status'], ('%.5g' % rec['closure']) if rec.get('closure') is not None else '-', rec.get('dmin') or float('nan'), rec.get('dmin_parabolic') or float('nan'),
              ('%.1f' % rec['seconds']) if rec.get('seconds') else '-', ('%.1e' % rec['dE']) if 'dE' in rec else '-', ('%.1e' % rec['dL']) if 'dL' in rec else '-', ('ok' if rec.get('check_1e14') else ('FAILS' if 'dE' in rec else '-'))))
        recs.append(rec)
    done = [r for r in recs if r.get('status') == 'done']
    lines.append('points %d; finished %d; closure below 1e-6 for %d; closure 1e-6 or more: %s; not finished: %s; check 1e-14 failed: %s' % (
        len(recs), len(done), sum(1 for r in done if r['closure'] < 1e-6), [r['id'] for r in done if r['closure'] >= 1e-6], [r['id'] for r in recs if r.get('status') != 'done'], [r['id'] for r in done if r.get('check_1e14') is False]))
    print('\n'.join(lines))
    if out: json.dump(recs, open(out, 'x'))


if __name__ == '__main__':
    main()
