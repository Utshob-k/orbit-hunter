# SPDX-License-Identifier: MIT
# Henon's relation dT* = -pi L* d(turns) between consecutive recorded points of the stored traces t35 -, t44 -, t62 - and t72 -: the test of test/henon.test.js (which runs t35 - only) on all four. For consecutive recorded points
# a, b with |d(turns)| of 1e-6 or more: s = sign(L) pi Lm d(turns) with Lm the mean of |L*| of the pair, deviation |dT* - s| / max(|dT*|, |s|). The sign of L of a trace is that of the angular momentum of its first point, computed from (u1, u2, lam)
# in the frame of the centre of mass (L = sum of x_i vy_i with x = (-1, lam, 1) - lam/3 and vy = (u1, u2, -u1 - u2)); the relation reads dT* = -pi L* d(turns) for L < 0, as the header of the test says, and with the other sign for L > 0.
# Per trace: the number of pairs, the median (mean of the two middle values for an even number) and the largest deviation.
# Gate: the result for t35 - must equal data/deep/henon-t35m.json (median and largest) to 1e-9 relative; if not, the script stops without writing.
#   python tools/henon-relation.py REL OUT.json        REL = the repository folder; OUT.json must be new. Reads only data/deep/traces/<label>.json and data/deep/henon-t35m.json.
import sys, os, json, math
if len(sys.argv) < 3: sys.stderr.write('usage: python tools/henon-relation.py REL OUT.json\n'); sys.exit(2)
BS = chr(92)
REL = sys.argv[1].replace(BS, '/').rstrip('/') + '/'
OUT = sys.argv[2]
if os.path.exists(OUT): sys.exit('exists, not overwriting: ' + OUT)
L = lambda p: json.load(open(p, encoding='utf8'))
res = dict(what='', commands=['python tools/henon-relation.py REL OUT.json'], inputs=[], traces={})
for label in ('t35m', 't44m', 't62m', 't72m'):
    P = L(REL + 'data/deep/traces/%s.json' % label)['points']
    p0 = P[0]; cm = p0['lam'] / 3
    Lang = (-1 - cm) * p0['u1'] + (p0['lam'] - cm) * p0['u2'] + (1 - cm) * (-p0['u1'] - p0['u2'])
    sign = -1.0 if Lang < 0 else 1.0
    dev = []
    for i in range(1, len(P)):
        a, b = P[i - 1], P[i]
        dT, dturn, Lm = b['Tstar'] - a['Tstar'], b['turns'] - a['turns'], (abs(a['Lstar']) + abs(b['Lstar'])) / 2
        if abs(dturn) >= 1e-6:
            s = sign * math.pi * Lm * dturn
            dev.append(abs(dT - s) / max(abs(dT), abs(s)))
    dev.sort()
    n = len(dev)
    med = dev[(n - 1) // 2] if n % 2 else (dev[n // 2 - 1] + dev[n // 2]) / 2
    res['traces'][label] = dict(recorded_points=len(P), pairs=n, median_deviation=med, max_deviation=dev[-1], sign_of_the_relation=sign, angular_momentum_of_the_first_point=Lang)
    res['inputs'].append('data/deep/traces/%s.json' % label)
st = L(REL + 'data/deep/henon-t35m.json')
t = res['traces']['t35m']
ok = t['pairs'] == st['pairs'] and abs(t['median_deviation'] - st['median_deviation']) <= 1e-9 * st['median_deviation'] and abs(t['max_deviation'] - st['max_deviation']) <= 1e-9 * st['max_deviation']
res['gate_t35m_equals_henon_t35m_json'] = ok
if not ok: sys.exit('GATE FAILED: t35m %s against %s' % (t, st))
res['inputs'].append('data/deep/henon-t35m.json')
res['what'] = ("Henon's relation dT* = -pi L* d(turns) between consecutive recorded points of the four stored traces, the test of test/henon.test.js applied to each: pairs with |d(turns)| of 1e-6 or more, "
               'the median and the largest relative deviation |dT* - s| / max(|dT*|, |s|) with s = -pi L* d(turns), L* the mean of |L*| of the pair (the sign of the relation is that of L of the first point of the trace)')
json.dump(res, open(OUT, 'x', encoding='utf8'), indent=1)
print('written', OUT, '(gate t35m ok)')
for l, v in res['traces'].items(): print(l, 'pairs', v['pairs'], 'median %.3g' % v['median_deviation'], 'largest %.3g' % v['max_deviation'])
