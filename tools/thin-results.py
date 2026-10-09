# makes a smaller copy of a results file of tools/satellite-worker.mjs: the numbers of every curve point are rounded (lam, T*, L* and the state columns to 14 significant digits,
# the closure error to 4, the others to 10). nothing is removed: every curve point and every other field stays, so the
# scripts that read the file (recall-cpc, verify-summary, cpc-coverage, bifurcation-table) give the same numbers.
# python tools/thin-results.py in.jsonl out.jsonl
import json, sys
if len(sys.argv) != 3: sys.exit('usage: python tools/thin-results.py in.jsonl out.jsonl')
DIGITS = [14, 14, 14, 4, 10, 14, 14, 14]   # lam, T*, L*, closure error, ratio, u1, u2, t (the column order of the curves)
def rnd(x, d):
    if not isinstance(x, (int, float)) or x != x or x in (float('inf'), float('-inf')): return x   # null and non-finite values stay as they are
    return float('%.*g' % (d, x))
def rnd_closure(x, d):
    y = rnd(x, d)
    return x if isinstance(x, float) and (y < 1e-7) != (x < 1e-7) else y   # the scripts cut the arms at a closure error of 1e-7: a rounded value must stay on the same side
n = 0
with open(sys.argv[1]) as f, open(sys.argv[2], 'w') as g:
    for line in f:
        if not line.strip(): continue
        r = json.loads(line)
        for b in r['branches']:
            b['curve'] = [[(rnd_closure if i == 3 else rnd)(v, DIGITS[i]) if i < len(DIGITS) else v for i, v in enumerate(p)] for p in b['curve']]
        g.write(json.dumps(r, separators=(',', ':')) + '\n'); n += 1
print(n, 'jobs written to', sys.argv[2])
