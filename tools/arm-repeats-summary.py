# combines the outputs of tools/arm-repeat-check.mjs (data/satellite-results*.repeats-*.json) into data/arm-repeats.json:
# for every arm with stored states the number of times its orbits repeat a shorter orbit (minimum over the sampled points), the number that a pure k fold repeat
# of the parent would have, and whether the arm is just the repeat curve of the parent (then it is not a branch). python tools/arm-repeats-summary.py
import json, glob
PARENTS = {0: (4.96, 1), 1: (33.745, 9), 2: (17.847, 1), 3: (19.769, 1), 4: (47.065, 2), 5: (9.658, 1), 6: (29.31, 1)}   # orbit index: (T*, repeat count of the parent)
out = {}
skipped = 0
for f in sorted(glob.glob('data/satellite-results*.repeats-*.json')):
    f = f.replace('\\', '/')   # glob gives backslashes on Windows
    src = f.split('.repeats')[0].split('/')[-1]
    for a in json.load(open(f)):
        if a['anyFailed']: skipped += 1; continue
        n = min(p['nRepeat'] for p in a['points'])
        par = PARENTS[a['orbit']][1]
        expected = par * a['k']
        key = '%d|%d|%.4f|%d' % (a['orbit'], a['k'], a['lamBP'], a['sgn'])
        out[key] = {'file': src, 'orbit': a['orbit'], 'k': a['k'], 'lamBP': a['lamBP'], 'sgn': a['sgn'], 'nRepeat': n, 'expectedIfRepeatCurve': expected, 'onRepeatCurve': n == expected, 'parentRepeat': par}
json.dump(out, open('data/arm-repeats.json', 'w'), indent=1)
arms = list(out.values())
print(len(arms), 'arms with stored states checked' + (', %d more skipped because the integration failed at a sampled point' % skipped if skipped else ''))
print('on the repeat curve of the parent (not a branch):', sum(a['onRepeatCurve'] for a in arms))
print('arms that are repeats of a shorter orbit but not the parent repeat curve:', sum((a['nRepeat'] > 1 and not a['onRepeatCurve']) for a in arms))
print('arms that are primitive orbits (nRepeat 1):', sum(a['nRepeat'] == 1 for a in arms))
for a in arms:
    if a['onRepeatCurve']: print('  repeat curve:', a['file'], 'orbit', a['orbit'], 'k', a['k'], 'lamBP %.4f' % a['lamBP'], 'sgn', a['sgn'])
