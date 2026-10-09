# counts the arms of the verification files data/satellite-results*.verified.json (tools/verify-branches.mjs) by the checks they pass, and the branch points that have at least one arm
# that passes all of them. an arm passes when
#   1. the syzygy word is (01)^K with the expected 2K syzygies at every sampled point,
#   2. re-closing three points with more pieces and a tighter tolerance reproduces lam and T* (relative change below 1e-8, residual below 1e-9),
#   3. no jump of T*, L* between neighbouring points is more than 50 times the median jump,
#   4. it is not the repeat curve of the parent (data/arm-repeats.json)
# several files can hold the same arm (a rerun): the last file in the order of the arguments wins.   python tools/verify-summary.py
import json, collections, sys
FILES = ['data/satellite-results%d.verified.json' % n for n in (4, 5, 6, 7)]
rep = json.load(open('data/arm-repeats.json'))
arms = {}
for f in FILES:
    for x in json.load(open(f)):
        arms['%d|%d|%.4f|%d' % (x['orbit'], x['k'], x['lamBP'], x['sgn'])] = (f, x)
if not arms: sys.exit('no verified arm: nothing was counted')
cat = collections.Counter(); passed_bp = set(); stats = []
for key, (f, x) in arms.items():
    r = rep.get(key)
    word_ok = all(c.get('syzygies') == c.get('expected') for c in x['checks'])
    close_ok = all(c['reclosed'] < 1e-9 and c['dTs'] is not None and c['dTs'] < 1e-8 for c in x['checks'] if 'reclosed' in c)
    smooth_ok = x['maxJumpOverMedian'] is not None and x['maxJumpOverMedian'] <= 50
    on_rep = bool(r and r['onRepeatCurve'])
    ok = word_ok and close_ok and smooth_ok and not on_rep
    cat['arms'] += 1
    if on_rep: cat['repeat curve of the parent'] += 1
    else:
        cat['not repeat curve'] += 1
        cat['word ok'] += word_ok; cat['re-closing ok'] += close_ok; cat['smooth ok'] += smooth_ok
        if ok: cat['pass all'] += 1; passed_bp.add((x['orbit'], x['k'], round(x['lamBP'], 3)))
        else: stats.append((x['orbit'], x['k'], round(x['lamBP'], 4), x['sgn'], 'word' if not word_ok else '', 'close' if not close_ok else '', 'jump %d' % x['maxJumpOverMedian'] if not smooth_ok else ''))
for k in ('arms', 'repeat curve of the parent', 'not repeat curve', 'word ok', 're-closing ok', 'smooth ok', 'pass all'): print('%5d  %s' % (cat[k], k))
print('%5d  distinct branch points with at least one arm that passes all checks' % len(passed_bp))
print('arms that do not pass (parent orbit index, k, lam of the branch point, sign, what failed):')
for s in sorted(stats): print('  ', s)
json.dump(sorted(passed_bp), open('data/verified-branch-points.json', 'w'))
