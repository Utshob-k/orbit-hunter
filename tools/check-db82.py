# checks every transcribed row of the Davoust and Broucke tables against the printed value of -27 C^2 H and tries to repair a misread digit
# (one digit of y1d, x2, y2d or of the printed value changed) when it does not agree. python tools/check-db82.py data/db82-table4.json ...
import json, sys
m = 1 / 3


def c27(y1d, x2, y2d):
    pos = [0.0, 1.0, x2]
    vel = [0.0, y1d, y2d]
    R = sum(pos) / 3
    V = sum(vel) / 3
    p = [a - R for a in pos]
    v = [a - V for a in vel]
    C = sum(m * p[i] * v[i] for i in range(3))
    KE = sum(0.5 * m * v[i] ** 2 for i in range(3))
    PE = -sum(m * m / abs(p[i] - p[j]) for i in range(3) for j in range(i + 1, 3))
    return -27 * C * C * (KE + PE)


def variants(x):
    s = '%.7f' % abs(x)
    sign = -1 if x < 0 else 1
    for i, ch in enumerate(s):
        if ch == '.':
            continue
        for d in '0123456789':
            if d != ch:
                yield sign * float(s[:i] + d + s[i + 1:])


for f in sys.argv[1:]:
    d = json.load(open(f))
    bad = []
    for r in d['rows']:
        try:
            c = c27(r['y1d'], r['x2'], r['y2d'])
        except ZeroDivisionError:
            bad.append((r['N'], 'division by zero'))
            continue
        if abs(c - r['c27']) < 2e-6:
            continue
        fixes = []
        base = {'y1d': r['y1d'], 'x2': r['x2'], 'y2d': r['y2d']}
        for k in base:
            for v in variants(base[k]):
                t = dict(base)
                t[k] = v
                try:
                    cc = c27(t['y1d'], t['x2'], t['y2d'])
                except ZeroDivisionError:
                    continue
                if abs(cc - r['c27']) < 2e-7:
                    fixes.append((k, v))
        for v in variants(r['c27']):
            if abs(c - v) < 2e-7:
                fixes.append(('c27', v))
        bad.append((r['N'], 'printed %.7f computed %.7f' % (r['c27'], c), fixes[:3]))
    print(f, len(d['rows']), 'rows;', len(bad), 'to check')
    for b in bad:
        print('  ', b)
